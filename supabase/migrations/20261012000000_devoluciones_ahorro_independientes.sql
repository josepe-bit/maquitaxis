-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - FASE 3.13.7
-- SEPARACIÓN DEFINITIVA DE DEVOLUCIONES DE AHORRO DEL CONDUCTOR
-- ====================================================================
-- Principios de Seguridad y Aislamiento Multiempresa:
-- 1. Tabla física especializada: public.devoluciones_ahorro_conductor.
-- 2. Cero escrituras en public.liquidacion ni alteración de prestaciones sociales.
-- 3. Aislamiento multiempresa estricto en RLS (SELECT, INSERT, UPDATE, DELETE).
-- 4. Cálculo de saldo y validación de idempotencia acotados al ámbito empresarial.
-- 5. Control estricto de sesión en funciones SECURITY DEFINER (auth.uid() IS NULL protegido).
-- 6. Doble bloqueo consultivo (anti-replay por clave + exclusión mutua por conductor).
-- 7. Registro automático en supabase_migrations.schema_migrations (20261012000000).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. CREACIÓN DE LA TABLA FÍSICA INDEPENDIENTE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.devoluciones_ahorro_conductor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.terceros(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    detail TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CONSTRAINT chk_devolucion_ahorro_amount_positive CHECK (amount > 0),
    servicio_id UUID REFERENCES public.servicios(id) ON DELETE RESTRICT,
    idempotency_key UUID NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Restricciones de integridad cronológica
    CONSTRAINT chk_devolucion_fechas_periodo CHECK (to_date >= from_date),
    CONSTRAINT chk_devolucion_fecha_pago_valida CHECK (payment_date >= from_date)
);

-- Índices optimizados para reportes y aislamiento multiempresa
CREATE INDEX IF NOT EXISTS idx_devoluciones_ahorro_driver_fecha
    ON public.devoluciones_ahorro_conductor (driver_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_devoluciones_ahorro_servicio
    ON public.devoluciones_ahorro_conductor (servicio_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_devoluciones_ahorro_idempotency
    ON public.devoluciones_ahorro_conductor (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_devoluciones_ahorro_fechas_periodo
    ON public.devoluciones_ahorro_conductor (from_date, to_date);

-- --------------------------------------------------------------------
-- 2. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (MULTIEMPRESA ESTRICTO)
-- --------------------------------------------------------------------
ALTER TABLE public.devoluciones_ahorro_conductor ENABLE ROW LEVEL SECURITY;

-- 2.1 Política SELECT:
-- Superadmin (Nivel 1): Acceso global.
-- Empresa (Nivel 2): ÚNICAMENTE registros con el servicio_id de su empresa.
-- Conductor (Nivel 3+): ÚNICAMENTE sus propias devoluciones.
DROP POLICY IF EXISTS "devoluciones_ahorro_select_policy" ON public.devoluciones_ahorro_conductor;
CREATE POLICY "devoluciones_ahorro_select_policy" ON public.devoluciones_ahorro_conductor
    FOR SELECT TO authenticated
    USING (
        public.get_user_service_level() = 1
        OR (
            public.get_user_service_level() = 2
            AND servicio_id = public.get_user_servicio_id()
        )
        OR (
            public.get_user_service_level() >= 3
            AND driver_id IN (
                SELECT t.id FROM public.terceros t WHERE t.user_id = auth.uid()
            )
        )
    );

-- 2.2 Política INSERT:
-- Superadmin (Nivel 1): Permitido.
-- Empresa (Nivel 2): Requiere que servicio_id coincida con su empresa Y que el conductor
--                   pertenezca a su flota (asignación, turnos o producción).
DROP POLICY IF EXISTS "devoluciones_ahorro_insert_policy" ON public.devoluciones_ahorro_conductor;
CREATE POLICY "devoluciones_ahorro_insert_policy" ON public.devoluciones_ahorro_conductor
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_service_level() = 1
        OR (
            public.get_user_service_level() = 2
            AND servicio_id = public.get_user_servicio_id()
            AND (
                driver_id IN (
                    SELECT v.driver_id FROM public.vehiculos v
                    WHERE v.servicio_id = public.get_user_servicio_id() AND v.driver_id IS NOT NULL
                    UNION
                    SELECT vt.driver_id FROM public.vehiculo_turnos vt
                    JOIN public.vehiculos v ON vt.vehiculo_id = v.id
                    WHERE v.servicio_id = public.get_user_servicio_id() AND vt.driver_id IS NOT NULL
                    UNION
                    SELECT pr.driver_id FROM public.produccion pr
                    JOIN public.vehiculos v ON pr.vehiculo_id = v.id
                    WHERE v.servicio_id = public.get_user_servicio_id() AND pr.driver_id IS NOT NULL
                )
            )
        )
    );

-- 2.3 Política UPDATE:
-- Superadmin o Empresa sobre registros exclusivos de su servicio_id.
DROP POLICY IF EXISTS "devoluciones_ahorro_update_policy" ON public.devoluciones_ahorro_conductor;
CREATE POLICY "devoluciones_ahorro_update_policy" ON public.devoluciones_ahorro_conductor
    FOR UPDATE TO authenticated
    USING (
        public.get_user_service_level() = 1
        OR (
            public.get_user_service_level() = 2
            AND servicio_id = public.get_user_servicio_id()
        )
    );

-- 2.4 Política DELETE:
-- Solo Nivel 1 (Superadministrador).
DROP POLICY IF EXISTS "devoluciones_ahorro_delete_policy" ON public.devoluciones_ahorro_conductor;
CREATE POLICY "devoluciones_ahorro_delete_policy" ON public.devoluciones_ahorro_conductor
    FOR DELETE TO authenticated
    USING (
        public.get_user_service_level() = 1
    );

-- --------------------------------------------------------------------
-- 3. RPC DE CONSULTA DE SALDO CON ÁMBITO EMPRESARIAL
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_driver_savings_summary(UUID);
DROP FUNCTION IF EXISTS public.get_driver_savings_summary(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_driver_savings_summary(
    p_driver_id UUID,
    p_servicio_id UUID DEFAULT NULL
)
RETURNS TABLE (
    res_driver_id UUID,
    res_driver_name TEXT,
    res_total_generated NUMERIC,
    res_total_returned NUMERIC,
    res_available_balance NUMERIC
) AS $$
DECLARE
    v_name TEXT;
    v_generated NUMERIC;
    v_returned_historic NUMERIC;
    v_returned_new NUMERIC;
    v_total_returned NUMERIC;
    v_caller_level INTEGER;
    v_caller_servicio_id UUID;
    v_effective_servicio_id UUID;
BEGIN
    IF p_driver_id IS NULL THEN
        RAISE EXCEPTION 'El identificador del conductor (p_driver_id) es obligatorio.';
    END IF;

    SELECT t.name INTO v_name FROM public.terceros t WHERE t.id = p_driver_id;
    IF v_name IS NULL THEN
        RAISE EXCEPTION 'El conductor especificado no existe.';
    END IF;

    -- Validaciones de autorización multiempresa
    IF auth.uid() IS NULL THEN
        IF CURRENT_USER NOT IN ('service_role', 'postgres') THEN
            RAISE EXCEPTION 'Acceso denegado: Sesión no autenticada.';
        END IF;
        v_effective_servicio_id := p_servicio_id;
    ELSE
        v_caller_level := public.get_user_service_level();
        v_caller_servicio_id := public.get_user_servicio_id();

        IF v_caller_level >= 3 THEN
            -- Nivel 3: Conductor consultando su propio saldo
            IF NOT EXISTS (SELECT 1 FROM public.terceros t WHERE t.id = p_driver_id AND t.user_id = auth.uid()) THEN
                RAISE EXCEPTION 'Acceso denegado: Un conductor solo puede consultar su propio saldo de ahorro.';
            END IF;
            IF p_servicio_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM public.vehiculos v
                WHERE v.servicio_id = p_servicio_id
                  AND (
                      v.driver_id = p_driver_id
                      OR v.id IN (SELECT vt.vehiculo_id FROM public.vehiculo_turnos vt WHERE vt.driver_id = p_driver_id)
                      OR v.id IN (SELECT pr.vehiculo_id FROM public.produccion pr WHERE pr.driver_id = p_driver_id)
                  )
            ) THEN
                RAISE EXCEPTION 'Acceso denegado: No tienes registro de actividad con la empresa especificada.';
            END IF;
            v_effective_servicio_id := p_servicio_id;
        ELSIF v_caller_level = 2 THEN
            -- Nivel 2: Administrador de empresa (validar pertenencia a flota)
            IF p_servicio_id IS NOT NULL AND p_servicio_id <> v_caller_servicio_id THEN
                RAISE EXCEPTION 'Acceso denegado: No puedes operar con otra empresa.';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM public.vehiculos v
                WHERE v.servicio_id = v_caller_servicio_id
                  AND (
                      v.driver_id = p_driver_id
                      OR v.id IN (SELECT vt.vehiculo_id FROM public.vehiculo_turnos vt WHERE vt.driver_id = p_driver_id)
                      OR v.id IN (SELECT pr.vehiculo_id FROM public.produccion pr WHERE pr.driver_id = p_driver_id)
                  )
            ) THEN
                RAISE EXCEPTION 'Acceso denegado: El conductor no pertenece a la flota de tu empresa.';
            END IF;
            -- Forzar ámbito estricto a su propia empresa
            v_effective_servicio_id := v_caller_servicio_id;
        ELSE
            -- Nivel 1: Superadministrador
            v_effective_servicio_id := p_servicio_id;
        END IF;
    END IF;

    -- 1. Ahorro generado en producción:
    IF v_effective_servicio_id IS NOT NULL THEN
        SELECT COALESCE(SUM(p.savings_amount), 0) INTO v_generated
        FROM public.produccion p
        JOIN public.vehiculos v ON p.vehiculo_id = v.id
        WHERE p.driver_id = p_driver_id
          AND p.status = 'trabajo'
          AND v.servicio_id = v_effective_servicio_id;
    ELSE
        SELECT COALESCE(SUM(p.savings_amount), 0) INTO v_generated
        FROM public.produccion p
        WHERE p.driver_id = p_driver_id
          AND p.status = 'trabajo';
    END IF;

    -- 2. Devoluciones históricas en liquidacion (modo read-only reconciliado)
    SELECT COALESCE(SUM(l.amount), 0) INTO v_returned_historic
    FROM public.liquidacion l
    WHERE l.tercero_id = p_driver_id
      AND l.concept = 'devolucion_ahorro'
      AND (
          v_effective_servicio_id IS NULL
          OR EXISTS (
              SELECT 1 FROM public.vehiculos v
              WHERE v.servicio_id = v_effective_servicio_id AND v.driver_id = p_driver_id
          )
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.devoluciones_ahorro_conductor d WHERE d.id = l.id
      );

    -- 3. Nuevas devoluciones en la tabla especializada acotadas a la empresa
    IF v_effective_servicio_id IS NOT NULL THEN
        SELECT COALESCE(SUM(d.amount), 0) INTO v_returned_new
        FROM public.devoluciones_ahorro_conductor d
        WHERE d.driver_id = p_driver_id
          AND d.servicio_id = v_effective_servicio_id;
    ELSE
        SELECT COALESCE(SUM(d.amount), 0) INTO v_returned_new
        FROM public.devoluciones_ahorro_conductor d
        WHERE d.driver_id = p_driver_id;
    END IF;

    v_total_returned := v_returned_historic + v_returned_new;

    RETURN QUERY
    SELECT
        p_driver_id AS res_driver_id,
        v_name AS res_driver_name,
        v_generated AS res_total_generated,
        v_total_returned AS res_total_returned,
        GREATEST(v_generated - v_total_returned, 0) AS res_available_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_driver_savings_summary(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_savings_summary(UUID, UUID) TO authenticated, service_role;

-- --------------------------------------------------------------------
-- 4. RPC V2 ATÓMICA DE REGISTRO CON IDEMPOTENCIA Y ADVISORY LOCKS
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_driver_savings_return_v2(UUID, NUMERIC, DATE, DATE, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS public.register_driver_savings_return_v2(UUID, NUMERIC, DATE, DATE, DATE, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.register_driver_savings_return_v2(
    p_driver_id UUID,
    p_amount NUMERIC,
    p_payment_date DATE,
    p_from_date DATE,
    p_to_date DATE,
    p_detail TEXT,
    p_idempotency_key UUID,
    p_servicio_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_level INTEGER;
    v_caller_servicio_id UUID;
    v_effective_servicio_id UUID;
    v_driver_name TEXT;
    v_generated NUMERIC;
    v_returned_historic NUMERIC;
    v_returned_new NUMERIC;
    v_total_returned NUMERIC;
    v_available NUMERIC;
    v_existing_rec RECORD;
    v_new_devolucion_id UUID;
BEGIN
    -- Validaciones de integridad de entrada
    IF p_driver_id IS NULL THEN
        RAISE EXCEPTION 'El identificador del conductor (p_driver_id) es obligatorio.';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto a devolver debe ser estrictamente mayor a cero.';
    END IF;
    IF p_payment_date IS NULL OR p_from_date IS NULL OR p_to_date IS NULL THEN
        RAISE EXCEPTION 'Todas las fechas (pago, desde, hasta) son obligatorias.';
    END IF;
    IF p_to_date < p_from_date THEN
        RAISE EXCEPTION 'La fecha final del período (%) no puede ser anterior a la fecha inicial (%).', p_to_date, p_from_date;
    END IF;
    IF p_payment_date < p_from_date THEN
        RAISE EXCEPTION 'La fecha de pago (%) no puede ser anterior al inicio del período (%).', p_payment_date, p_from_date;
    END IF;
    IF p_detail IS NULL OR TRIM(p_detail) = '' THEN
        RAISE EXCEPTION 'El detalle de la devolución es obligatorio.';
    END IF;
    IF p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'La clave de idempotencia es obligatoria.';
    END IF;

    SELECT t.name INTO v_driver_name FROM public.terceros t WHERE t.id = p_driver_id;
    IF v_driver_name IS NULL THEN
        RAISE EXCEPTION 'El conductor especificado no existe.';
    END IF;

    -- Control de acceso y asignación de ámbito multiempresa
    IF auth.uid() IS NULL THEN
        IF CURRENT_USER NOT IN ('service_role', 'postgres') THEN
            RAISE EXCEPTION 'Acceso denegado: Sesión no autenticada.';
        END IF;
        v_effective_servicio_id := p_servicio_id;
    ELSE
        v_caller_level := public.get_user_service_level();
        v_caller_servicio_id := public.get_user_servicio_id();

        IF v_caller_level >= 3 THEN
            RAISE EXCEPTION 'Acceso denegado: Los conductores no pueden registrar devoluciones de ahorro.';
        ELSIF v_caller_level = 2 THEN
            IF p_servicio_id IS NOT NULL AND p_servicio_id <> v_caller_servicio_id THEN
                RAISE EXCEPTION 'Acceso denegado: No puedes operar con otra empresa.';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM public.vehiculos v
                WHERE v.servicio_id = v_caller_servicio_id
                  AND (
                      v.driver_id = p_driver_id
                      OR v.id IN (SELECT vt.vehiculo_id FROM public.vehiculo_turnos vt WHERE vt.driver_id = p_driver_id)
                      OR v.id IN (SELECT pr.vehiculo_id FROM public.produccion pr WHERE pr.driver_id = p_driver_id)
                  )
            ) THEN
                RAISE EXCEPTION 'Acceso denegado: El conductor no pertenece a la flota de tu empresa.';
            END IF;
            -- Neutralizar suplantación: forzar ámbito de la empresa del usuario
            v_effective_servicio_id := v_caller_servicio_id;
        ELSE
            -- Nivel 1: Superadministrador
            v_effective_servicio_id := COALESCE(
                p_servicio_id,
                (SELECT v.servicio_id FROM public.vehiculos v WHERE v.driver_id = p_driver_id LIMIT 1)
            );
        END IF;
    END IF;

    -- Bloqueo consultivo transaccional por clave de idempotencia (anti-replay)
    PERFORM pg_advisory_xact_lock(
        hashtext('devolucion_ahorro'::text),
        hashtext(p_idempotency_key::text)
    );

    -- Detección de reintento / replay idempotente con verificación multiempresa
    SELECT d.id, d.driver_id, d.amount, d.payment_date, d.from_date, d.to_date, d.detail, d.servicio_id
    INTO v_existing_rec
    FROM public.devoluciones_ahorro_conductor d
    WHERE d.idempotency_key = p_idempotency_key;

    IF v_existing_rec.id IS NOT NULL THEN
        IF v_existing_rec.servicio_id IS DISTINCT FROM v_effective_servicio_id THEN
            RAISE EXCEPTION 'Conflicto de idempotencia: La clave ya fue utilizada por otra empresa.';
        END IF;

        IF v_existing_rec.driver_id <> p_driver_id
           OR v_existing_rec.amount <> p_amount
           OR v_existing_rec.payment_date <> p_payment_date
           OR v_existing_rec.from_date <> p_from_date
           OR v_existing_rec.to_date <> p_to_date
           OR TRIM(v_existing_rec.detail) <> TRIM(p_detail)
        THEN
            RAISE EXCEPTION 'Conflicto de idempotencia: La clave ya fue utilizada con parámetros discordantes.';
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'is_replay', true,
            'devolucion_id', v_existing_rec.id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name,
            'returned_amount', v_existing_rec.amount,
            'idempotency_key', p_idempotency_key
        );
    END IF;

    -- Bloqueo consultivo transaccional por conductor (exclusión mutua estricta de saldo)
    PERFORM pg_advisory_xact_lock(
        hashtext('devolucion_ahorro_driver'::text),
        hashtext(p_driver_id::text)
    );

    -- Validación de saldo disponible en el ámbito empresarial
    IF v_effective_servicio_id IS NOT NULL THEN
        SELECT COALESCE(SUM(p.savings_amount), 0) INTO v_generated
        FROM public.produccion p
        JOIN public.vehiculos v ON p.vehiculo_id = v.id
        WHERE p.driver_id = p_driver_id
          AND p.status = 'trabajo'
          AND v.servicio_id = v_effective_servicio_id;

        SELECT COALESCE(SUM(d.amount), 0) INTO v_returned_new
        FROM public.devoluciones_ahorro_conductor d
        WHERE d.driver_id = p_driver_id
          AND d.servicio_id = v_effective_servicio_id;
    ELSE
        SELECT COALESCE(SUM(p.savings_amount), 0) INTO v_generated
        FROM public.produccion p
        WHERE p.driver_id = p_driver_id
          AND p.status = 'trabajo';

        SELECT COALESCE(SUM(d.amount), 0) INTO v_returned_new
        FROM public.devoluciones_ahorro_conductor d
        WHERE d.driver_id = p_driver_id;
    END IF;

    SELECT COALESCE(SUM(l.amount), 0) INTO v_returned_historic
    FROM public.liquidacion l
    WHERE l.tercero_id = p_driver_id
      AND l.concept = 'devolucion_ahorro'
      AND (
          v_effective_servicio_id IS NULL
          OR EXISTS (
              SELECT 1 FROM public.vehiculos v
              WHERE v.servicio_id = v_effective_servicio_id AND v.driver_id = p_driver_id
          )
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.devoluciones_ahorro_conductor d WHERE d.id = l.id
      );

    v_total_returned := v_returned_historic + v_returned_new;
    v_available := GREATEST(v_generated - v_total_returned, 0);

    IF p_amount > v_available THEN
        RAISE EXCEPTION 'Fondos insuficientes: El monto a devolver ($%) supera el saldo disponible actual ($%).',
            p_amount, v_available;
    END IF;

    -- Inserción segura y atómica en la tabla física especializada
    v_new_devolucion_id := gen_random_uuid();

    INSERT INTO public.devoluciones_ahorro_conductor (
        id,
        driver_id,
        payment_date,
        from_date,
        to_date,
        detail,
        amount,
        servicio_id,
        idempotency_key,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_new_devolucion_id,
        p_driver_id,
        p_payment_date,
        p_from_date,
        p_to_date,
        TRIM(p_detail),
        p_amount,
        v_effective_servicio_id,
        p_idempotency_key,
        auth.uid(),
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_replay', false,
        'devolucion_id', v_new_devolucion_id,
        'driver_id', p_driver_id,
        'driver_name', v_driver_name,
        'returned_amount', p_amount,
        'new_available_balance', (v_available - p_amount),
        'idempotency_key', p_idempotency_key
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.register_driver_savings_return_v2(UUID, NUMERIC, DATE, DATE, DATE, TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_driver_savings_return_v2(UUID, NUMERIC, DATE, DATE, DATE, TEXT, UUID, UUID) TO authenticated, service_role;

-- --------------------------------------------------------------------
-- 5. RPC DE RECONCILIACIÓN POR CLAVE DE IDEMPOTENCIA
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reconcile_driver_savings_return(UUID);

CREATE OR REPLACE FUNCTION public.reconcile_driver_savings_return(
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_rec RECORD;
    v_driver_name TEXT;
    v_caller_level INTEGER;
    v_caller_servicio_id UUID;
BEGIN
    IF p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'La clave de idempotencia es obligatoria para reconciliar.';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtext('devolucion_ahorro'::text),
        hashtext(p_idempotency_key::text)
    );

    SELECT d.* INTO v_rec
    FROM public.devoluciones_ahorro_conductor d
    WHERE d.idempotency_key = p_idempotency_key;

    IF v_rec.id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'NOT_FOUND_CONFIRMED',
            'idempotency_key', p_idempotency_key
        );
    END IF;

    IF auth.uid() IS NULL THEN
        IF CURRENT_USER NOT IN ('service_role', 'postgres') THEN
            RAISE EXCEPTION 'Acceso denegado: Sesión no autenticada.';
        END IF;
    ELSE
        v_caller_level := public.get_user_service_level();
        v_caller_servicio_id := public.get_user_servicio_id();

        IF v_caller_level >= 3 THEN
            IF NOT EXISTS (SELECT 1 FROM public.terceros t WHERE t.id = v_rec.driver_id AND t.user_id = auth.uid()) THEN
                RAISE EXCEPTION 'Acceso denegado: No puedes consultar devoluciones de otros conductores.';
            END IF;
        ELSIF v_caller_level = 2 THEN
            IF v_rec.servicio_id IS DISTINCT FROM v_caller_servicio_id THEN
                RAISE EXCEPTION 'Acceso denegado: La devolución pertenece a otra empresa.';
            END IF;
        END IF;
    END IF;

    SELECT t.name INTO v_driver_name FROM public.terceros t WHERE t.id = v_rec.driver_id;

    RETURN jsonb_build_object(
        'status', 'CONFIRMED',
        'devolucion_id', v_rec.id,
        'driver_id', v_rec.driver_id,
        'driver_name', v_driver_name,
        'amount', v_rec.amount,
        'payment_date', v_rec.payment_date,
        'from_date', v_rec.from_date,
        'to_date', v_rec.to_date,
        'detail', v_rec.detail,
        'servicio_id', v_rec.servicio_id,
        'idempotency_key', v_rec.idempotency_key,
        'created_at', v_rec.created_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.reconcile_driver_savings_return(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_driver_savings_return(UUID) TO authenticated, service_role;

-- --------------------------------------------------------------------
-- 6. REGISTRO EN EL CONTROL DE MIGRACIONES DE SUPABASE
-- --------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
    '20261012000000',
    'devoluciones_ahorro_independientes',
    ARRAY['-- Separación definitiva de devoluciones de ahorro del conductor']
)
ON CONFLICT (version) DO NOTHING;
