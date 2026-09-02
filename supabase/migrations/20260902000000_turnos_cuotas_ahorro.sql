-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - ETAPAS 1 A 8
-- TURNOS DÍA/NOCHE, CUOTAS POR TURNO, AHORRO POR CONDUCTOR Y DEVOLUCIÓN ATÓMICA
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. CREAR TABLA VEHICULO_TURNOS CON RESTRICCIÓN DE UNICIDAD (ETAPAS 1 Y 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehiculo_turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  shift TEXT NOT NULL CHECK (shift IN ('dia', 'noche')),
  driver_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
  daily_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  savings_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_time TIME DEFAULT '05:00:00',
  end_time TIME DEFAULT '19:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehiculo_turnos_vehiculo_shift_key UNIQUE (vehiculo_id, shift)
);

-- --------------------------------------------------------------------
-- 2. MODIFICAR TABLA PRODUCCION PARA SOPORTAR TURNO Y CONDUCTOR (ETAPA 3)
-- --------------------------------------------------------------------
ALTER TABLE public.produccion 
ADD COLUMN IF NOT EXISTS shift TEXT CHECK (shift IN ('dia', 'noche')) DEFAULT 'dia',
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL;

ALTER TABLE public.produccion 
DROP CONSTRAINT IF EXISTS produccion_vehiculo_date_shift_key;

ALTER TABLE public.produccion 
ADD CONSTRAINT produccion_vehiculo_date_shift_key UNIQUE (vehiculo_id, date, shift);

-- --------------------------------------------------------------------
-- 3. MODIFICAR TABLA LIQUIDACION CON CLASIFICACIÓN SEGURA (ETAPA 5)
-- --------------------------------------------------------------------
ALTER TABLE public.liquidacion
ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.liquidacion
ADD COLUMN IF NOT EXISTS concept TEXT NOT NULL DEFAULT 'legacy_sin_clasificar'
CHECK (concept IN ('devolucion_ahorro', 'prestaciones_sociales', 'legacy_sin_clasificar', 'otro'));

-- Asegurar que registros antiguos queden como legacy_sin_clasificar (NO devoluciones de ahorro)
UPDATE public.liquidacion 
SET concept = 'legacy_sin_clasificar' 
WHERE concept IS NULL OR concept = 'devolucion_ahorro';

-- --------------------------------------------------------------------
-- 4. MIGRACIÓN HISTÓRICA DE TURNO DÍA INICIAL EN VEHICULO_TURNOS (ETAPA 4)
-- --------------------------------------------------------------------
INSERT INTO public.vehiculo_turnos (vehiculo_id, shift, driver_id, daily_fee, savings_amount, start_time, end_time)
SELECT 
  v.id, 
  'dia', 
  v.driver_id, 
  COALESCE(v.daily_fee, 0), 
  COALESCE(v.savings_amount, 0),
  COALESCE(v.start_shift_time, '05:00:00'::TIME),
  COALESCE(v.end_shift_time, '19:00:00'::TIME)
FROM public.vehiculos v
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehiculo_turnos vt WHERE vt.vehiculo_id = v.id AND vt.shift = 'dia'
);

-- Actualizar producciones históricas asignando shift = 'dia' (driver_id permanece NULL si no es verificable)
UPDATE public.produccion 
SET shift = 'dia' 
WHERE shift IS NULL;

-- --------------------------------------------------------------------
-- 5. FUNCIÓN CONSULTA DE SALDO CONSOLIDADO POR CONDUCTOR (ETAPA 6)
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_driver_savings_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_driver_savings_summary(p_driver_id UUID)
RETURNS TABLE (
  res_driver_id UUID,
  res_driver_name TEXT,
  res_total_generated NUMERIC,
  res_total_returned NUMERIC,
  res_available_balance NUMERIC
) AS $$
DECLARE
  v_generated NUMERIC;
  v_returned NUMERIC;
  v_name TEXT;
BEGIN
  SELECT t.name INTO v_name FROM public.terceros t WHERE t.id = p_driver_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'El conductor especificado no existe.';
  END IF;

  SELECT COALESCE(SUM(p.savings_amount), 0) INTO v_generated
  FROM public.produccion p
  WHERE p.driver_id = p_driver_id AND p.status = 'trabajo';

  SELECT COALESCE(SUM(l.amount), 0) INTO v_returned
  FROM public.liquidacion l
  WHERE l.tercero_id = p_driver_id AND l.concept = 'devolucion_ahorro';

  RETURN QUERY
  SELECT 
    p_driver_id AS res_driver_id,
    v_name AS res_driver_name,
    v_generated AS res_total_generated,
    v_returned AS res_total_returned,
    GREATEST(v_generated - v_returned, 0) AS res_available_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------------------------------
-- 6. FUNCIÓN RPC ATÓMICA DE DEVOLUCIÓN DE AHORRO CON CONCURRENCIA (ETAPA 7)
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_driver_savings_return(UUID, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.register_driver_savings_return(
  p_driver_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_generated NUMERIC;
  v_returned NUMERIC;
  v_available NUMERIC;
  v_driver_name TEXT;
  v_caller_level INTEGER;
  v_caller_servicio_id UUID;
  v_driver_servicio_id UUID;
  v_new_liquidacion_id UUID;
  v_from_date DATE;
  v_to_date DATE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto a devolver debe ser mayor a cero.';
  END IF;

  -- Bloqueo exclusivo de fila de control (FOR UPDATE en terceros)
  SELECT t.name INTO v_driver_name FROM public.terceros t WHERE t.id = p_driver_id FOR UPDATE;
  IF v_driver_name IS NULL THEN
    RAISE EXCEPTION 'El conductor especificado no existe en la base de datos.';
  END IF;

  -- Control estricto de autorización por rol/nivel
  IF auth.uid() IS NOT NULL THEN
    v_caller_level := public.get_user_service_level();
    v_caller_servicio_id := public.get_user_servicio_id();

    -- Conductor (Nivel 3): Rechazo total
    IF v_caller_level >= 3 THEN
      RAISE EXCEPTION 'Acceso denegado: Los conductores no tienen autorización para registrar devoluciones de ahorro.';
    END IF;

    -- Nivel 2 (Administrador de Empresa/Flota): Solo su propio servicio_id
    IF v_caller_level = 2 THEN
      SELECT v.servicio_id INTO v_driver_servicio_id 
      FROM public.vehiculos v
      WHERE v.id IN (
        SELECT vt.vehiculo_id FROM public.vehiculo_turnos vt WHERE vt.driver_id = p_driver_id
        UNION
        SELECT pr.vehiculo_id FROM public.produccion pr WHERE pr.driver_id = p_driver_id
      ) LIMIT 1;

      IF v_driver_servicio_id IS NOT NULL AND v_driver_servicio_id != v_caller_servicio_id THEN
        RAISE EXCEPTION 'Acceso denegado: El conductor no pertenece al servicio de tu empresa.';
      END IF;
    END IF;
  END IF;


  SELECT COALESCE(SUM(p.savings_amount), 0) INTO v_generated
  FROM public.produccion p
  WHERE p.driver_id = p_driver_id AND p.status = 'trabajo';

  SELECT COALESCE(SUM(l.amount), 0) INTO v_returned
  FROM public.liquidacion l
  WHERE l.tercero_id = p_driver_id AND l.concept = 'devolucion_ahorro';

  v_available := v_generated - v_returned;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Operación rechazada: El monto solicitado ($%) supera el saldo disponible actual ($%).', 
      p_amount, v_available;
  END IF;

  SELECT MIN(p.date), MAX(p.date) INTO v_from_date, v_to_date
  FROM public.produccion p
  WHERE p.driver_id = p_driver_id AND p.status = 'trabajo';

  INSERT INTO public.liquidacion (
    tercero_id,
    payment_date,
    from_date,
    to_date,
    detail,
    amount,
    concept
  ) VALUES (
    p_driver_id,
    CURRENT_DATE,
    COALESCE(v_from_date, CURRENT_DATE),
    COALESCE(v_to_date, CURRENT_DATE),
    COALESCE(p_notes, 'Devolución de Ahorro Acumulado del Conductor'),
    p_amount,
    'devolucion_ahorro'
  ) RETURNING id INTO v_new_liquidacion_id;

  RETURN jsonb_build_object(
    'success', true,
    'liquidacion_id', v_new_liquidacion_id,
    'driver_id', p_driver_id,
    'driver_name', v_driver_name,
    'returned_amount', p_amount,
    'new_available_balance', (v_available - p_amount)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------------------------------
-- 7. POLÍTICAS RLS PARA VEHICULO_TURNOS Y PERMISOS (ETAPA 8)
-- --------------------------------------------------------------------
ALTER TABLE public.vehiculo_turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de vehiculo_turnos" ON public.vehiculo_turnos;
DROP POLICY IF EXISTS "Permitir gestion de vehiculo_turnos" ON public.vehiculo_turnos;

CREATE POLICY "Permitir lectura de vehiculo_turnos" ON public.vehiculo_turnos FOR SELECT TO authenticated, anon
USING (
  public.get_user_service_level() <= 2 OR 
  driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
);

CREATE POLICY "Permitir gestion de vehiculo_turnos" ON public.vehiculo_turnos FOR ALL TO authenticated
USING (public.get_user_service_level() <= 2)
WITH CHECK (public.get_user_service_level() <= 2);

GRANT EXECUTE ON FUNCTION public.get_driver_savings_summary(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.register_driver_savings_return(UUID, NUMERIC, TEXT) TO authenticated, anon;

-- 8. POLÍTICAS DE SEGURIDAD RLS PARA PRODUCCION (PREVENCIÓN DE SUPLANTACIÓN Y ASIGNACIÓN)
DROP POLICY IF EXISTS "Permitir insercion y actualizacion de produccion" ON public.produccion;
DROP POLICY IF EXISTS "Permitir actualizacion de produccion" ON public.produccion;
DROP POLICY IF EXISTS "Permitir insercion de produccion" ON public.produccion;

CREATE POLICY "Permitir insercion de produccion" ON public.produccion 
FOR INSERT TO authenticated 
WITH CHECK (
  public.get_user_service_level() <= 2
  OR (
    driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.vehiculo_turnos vt 
        WHERE vt.vehiculo_id = produccion.vehiculo_id 
          AND vt.shift = produccion.shift 
          AND vt.driver_id = produccion.driver_id
      )
      OR EXISTS (
        SELECT 1 FROM public.vehiculos v
        WHERE v.id = produccion.vehiculo_id 
          AND v.driver_id = produccion.driver_id
      )
    )
  )
);

CREATE POLICY "Permitir actualizacion de produccion" ON public.produccion 
FOR UPDATE TO authenticated 
USING (
  public.get_user_service_level() <= 2
  OR driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
)
WITH CHECK (
  public.get_user_service_level() <= 2
  OR driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
);

