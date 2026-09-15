-- ==============================================================================
-- MIGRACIÓN: AISLAMIENTO MULTIEMPRESA EN OPERACIONES CRUD SOBRE TABLA VEHICULOS
-- ==============================================================================

-- 1. Eliminar la política anterior genérica "Permitir gestion de vehiculos" (FOR ALL)
DROP POLICY IF EXISTS "Permitir gestion de vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Admin/Owners manage vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Permitir insercion de vehiculos por servicio" ON public.vehiculos;
DROP POLICY IF EXISTS "Permitir actualizacion de vehiculos por servicio" ON public.vehiculos;
DROP POLICY IF EXISTS "Permitir eliminacion de vehiculos por servicio" ON public.vehiculos;

-- 2. POLÍTICA DE INSERCIÓN (INSERT)
-- Nivel 1 (Superusuario): Puede matricular vehículos para cualquier empresa.
-- Nivel 2 (Empresa Contratante): Únicamente puede matricular vehículos para su propia empresa (servicio_id = public.get_user_servicio_id()).
CREATE POLICY "Permitir insercion de vehiculos por servicio"
ON public.vehiculos
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_service_level() = 1
  OR (public.get_user_service_level() = 2 AND servicio_id = public.get_user_servicio_id())
);

-- 3. POLÍTICA DE ACTUALIZACIÓN (UPDATE)
-- Nivel 1: Puede modificar cualquier vehículo y reasignar empresas.
-- Nivel 2: Únicamente puede modificar vehículos pertenecientes a su empresa.
-- Bloquea la transferencia de un taxi propio hacia otra empresa (OLD.servicio_id = get_user_servicio_id() AND NEW.servicio_id = get_user_servicio_id()).
CREATE POLICY "Permitir actualizacion de vehiculos por servicio"
ON public.vehiculos
FOR UPDATE
TO authenticated
USING (
  public.get_user_service_level() = 1
  OR (public.get_user_service_level() = 2 AND servicio_id = public.get_user_servicio_id())
  OR driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
  OR owner_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
)
WITH CHECK (
  public.get_user_service_level() = 1
  OR (public.get_user_service_level() = 2 AND servicio_id = public.get_user_servicio_id())
  OR driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
  OR owner_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
);

-- 4. POLÍTICA DE ELIMINACIÓN (DELETE)
-- Nivel 1: Puede eliminar/desactivar cualquier vehículo.
-- Nivel 2: Únicamente puede eliminar vehículos pertenecientes a su empresa.
CREATE POLICY "Permitir eliminacion de vehiculos por servicio"
ON public.vehiculos
FOR DELETE
TO authenticated
USING (
  public.get_user_service_level() = 1
  OR (public.get_user_service_level() = 2 AND servicio_id = public.get_user_servicio_id())
);
