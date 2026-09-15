-- Migration: 20260919000000_ssocial_crud_isolation_rls.sql
-- Description: Implement enterprise-level CRUD isolation RLS policies for public.s_social (Seguridad Social).
-- Rules:
--   - Nivel 1 (Superusuario): full access to all records across all companies.
--   - Nivel 2 (Empresa Contratante): restricted to records where tercero_id belongs to a driver assigned to their company's vehicles.
--   - Drivers (Level 3): SELECT for their own driver record (user_id = auth.uid()).

ALTER TABLE public.s_social ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated view s_social" ON public.s_social;
DROP POLICY IF EXISTS "Authenticated insert s_social" ON public.s_social;
DROP POLICY IF EXISTS "Authenticated update s_social" ON public.s_social;
DROP POLICY IF EXISTS "Authenticated delete s_social" ON public.s_social;
DROP POLICY IF EXISTS "Permitir lectura de s_social" ON public.s_social;
DROP POLICY IF EXISTS "Permitir gestion de s_social" ON public.s_social;
DROP POLICY IF EXISTS "ssocial_select_policy" ON public.s_social;
DROP POLICY IF EXISTS "ssocial_insert_policy" ON public.s_social;
DROP POLICY IF EXISTS "ssocial_update_policy" ON public.s_social;
DROP POLICY IF EXISTS "ssocial_delete_policy" ON public.s_social;

-- SELECT Policy for public.s_social
CREATE POLICY "ssocial_select_policy" ON public.s_social
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

-- INSERT Policy for public.s_social
CREATE POLICY "ssocial_insert_policy" ON public.s_social
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

-- UPDATE Policy for public.s_social
CREATE POLICY "ssocial_update_policy" ON public.s_social
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

-- DELETE Policy for public.s_social
CREATE POLICY "ssocial_delete_policy" ON public.s_social
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
