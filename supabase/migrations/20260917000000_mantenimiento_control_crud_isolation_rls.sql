-- Migration: 20260917000000_mantenimiento_control_crud_isolation_rls.sql
-- Description: Implement enterprise-level CRUD isolation RLS policies for public.mantenimiento and public.control.
-- Rules:
--   - Nivel 1 (Superusuario): full access to all records across all companies.
--   - Nivel 2 (Empresa Contratante): restricted to records where vehiculo_id belongs to their assigned servicio_id.
--   - UPDATE policies enforce USING (existing record company) and WITH CHECK (new target vehicle company) to block cross-tenant updates.

-- Enable RLS (idempotent)
ALTER TABLE public.mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. POLÍTICAS DE RLS PARA TABLA MANTENIMIENTO (public.mantenimiento)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir lectura de mantenimiento" ON public.mantenimiento;
DROP POLICY IF EXISTS "Permitir gestion de mantenimiento" ON public.mantenimiento;
DROP POLICY IF EXISTS "mantenimiento_select_policy" ON public.mantenimiento;
DROP POLICY IF EXISTS "mantenimiento_insert_policy" ON public.mantenimiento;
DROP POLICY IF EXISTS "mantenimiento_update_policy" ON public.mantenimiento;
DROP POLICY IF EXISTS "mantenimiento_delete_policy" ON public.mantenimiento;

-- SELECT Policy for public.mantenimiento
CREATE POLICY "mantenimiento_select_policy" ON public.mantenimiento
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
  );

-- INSERT Policy for public.mantenimiento
CREATE POLICY "mantenimiento_insert_policy" ON public.mantenimiento
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
  );

-- UPDATE Policy for public.mantenimiento
CREATE POLICY "mantenimiento_update_policy" ON public.mantenimiento
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
  );

-- DELETE Policy for public.mantenimiento
CREATE POLICY "mantenimiento_delete_policy" ON public.mantenimiento
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
-- 2. POLÍTICAS DE RLS PARA TABLA CONTROL (public.control)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir lectura de control" ON public.control;
DROP POLICY IF EXISTS "Permitir gestion de control" ON public.control;
DROP POLICY IF EXISTS "control_select_policy" ON public.control;
DROP POLICY IF EXISTS "control_insert_policy" ON public.control;
DROP POLICY IF EXISTS "control_update_policy" ON public.control;
DROP POLICY IF EXISTS "control_delete_policy" ON public.control;

-- SELECT Policy for public.control
CREATE POLICY "control_select_policy" ON public.control
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
  );

-- INSERT Policy for public.control
CREATE POLICY "control_insert_policy" ON public.control
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
  );

-- UPDATE Policy for public.control
CREATE POLICY "control_update_policy" ON public.control
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
  );

-- DELETE Policy for public.control
CREATE POLICY "control_delete_policy" ON public.control
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
