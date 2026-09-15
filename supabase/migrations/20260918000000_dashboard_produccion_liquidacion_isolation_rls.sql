-- Migration: 20260918000000_dashboard_produccion_liquidacion_isolation_rls.sql
-- Description: Implement enterprise isolation RLS policies for public.produccion and public.liquidacion.
-- Rules:
--   - Nivel 1 (Superusuario): global CRUD access.
--   - Nivel 2 (Empresa Contratante): CRUD access restricted to records where vehiculo_id or tercero_id (driver) belongs to their assigned servicio_id.
--   - Drivers (Level 3): SELECT and INSERT/UPDATE for their own driver records (user_id = auth.uid()).

ALTER TABLE public.produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacion ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. POLÍTICAS DE RLS PARA TABLA PRODUCCIÓN (public.produccion)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Drivers and Admins view produccion" ON public.produccion;
DROP POLICY IF EXISTS "Drivers insert/update own produccion" ON public.produccion;
DROP POLICY IF EXISTS "Drivers update own produccion" ON public.produccion;
DROP POLICY IF EXISTS "Permitir lectura de produccion" ON public.produccion;
DROP POLICY IF EXISTS "Permitir insercion y actualizacion de produccion" ON public.produccion;
DROP POLICY IF EXISTS "Permitir actualizacion de produccion" ON public.produccion;
DROP POLICY IF EXISTS "Permitir insercion de produccion" ON public.produccion;
DROP POLICY IF EXISTS "Permitir eliminacion de produccion por admins" ON public.produccion;
DROP POLICY IF EXISTS "produccion_select_policy" ON public.produccion;
DROP POLICY IF EXISTS "produccion_insert_policy" ON public.produccion;
DROP POLICY IF EXISTS "produccion_update_policy" ON public.produccion;
DROP POLICY IF EXISTS "produccion_delete_policy" ON public.produccion;

-- SELECT Policy for public.produccion
CREATE POLICY "produccion_select_policy" ON public.produccion
  FOR SELECT TO authenticated
  USING (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND vehiculo_id IN (
        SELECT id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
      )
    )
    OR (
      driver_id IN (
        SELECT id FROM public.terceros
        WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT Policy for public.produccion
CREATE POLICY "produccion_insert_policy" ON public.produccion
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND vehiculo_id IN (
        SELECT id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
      )
    )
    OR (
      driver_id IN (
        SELECT id FROM public.terceros
        WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE Policy for public.produccion
CREATE POLICY "produccion_update_policy" ON public.produccion
  FOR UPDATE TO authenticated
  USING (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND vehiculo_id IN (
        SELECT id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
      )
    )
    OR (
      driver_id IN (
        SELECT id FROM public.terceros
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND vehiculo_id IN (
        SELECT id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
      )
    )
    OR (
      driver_id IN (
        SELECT id FROM public.terceros
        WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE Policy for public.produccion
CREATE POLICY "produccion_delete_policy" ON public.produccion
  FOR DELETE TO authenticated
  USING (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND vehiculo_id IN (
        SELECT id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
      )
    )
  );


-- ----------------------------------------------------------------------------
-- 2. POLÍTICAS DE RLS PARA TABLA LIQUIDACIÓN (public.liquidacion)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir lectura de liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Permitir gestion de liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Authenticated view liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Authenticated insert liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Authenticated update liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Authenticated delete liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "liquidacion_select_policy" ON public.liquidacion;
DROP POLICY IF EXISTS "liquidacion_insert_policy" ON public.liquidacion;
DROP POLICY IF EXISTS "liquidacion_update_policy" ON public.liquidacion;
DROP POLICY IF EXISTS "liquidacion_delete_policy" ON public.liquidacion;

-- SELECT Policy for public.liquidacion
CREATE POLICY "liquidacion_select_policy" ON public.liquidacion
  FOR SELECT TO authenticated
  USING (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND tercero_id IN (
        SELECT driver_id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
          AND driver_id IS NOT NULL
      )
    )
    OR (
      tercero_id IN (
        SELECT id FROM public.terceros
        WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT Policy for public.liquidacion
CREATE POLICY "liquidacion_insert_policy" ON public.liquidacion
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND tercero_id IN (
        SELECT driver_id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
          AND driver_id IS NOT NULL
      )
    )
  );

-- UPDATE Policy for public.liquidacion
CREATE POLICY "liquidacion_update_policy" ON public.liquidacion
  FOR UPDATE TO authenticated
  USING (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND tercero_id IN (
        SELECT driver_id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
          AND driver_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND tercero_id IN (
        SELECT driver_id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
          AND driver_id IS NOT NULL
      )
    )
  );

-- DELETE Policy for public.liquidacion
CREATE POLICY "liquidacion_delete_policy" ON public.liquidacion
  FOR DELETE TO authenticated
  USING (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND tercero_id IN (
        SELECT driver_id FROM public.vehiculos
        WHERE servicio_id = public.get_user_servicio_id()
          AND driver_id IS NOT NULL
      )
    )
  );
