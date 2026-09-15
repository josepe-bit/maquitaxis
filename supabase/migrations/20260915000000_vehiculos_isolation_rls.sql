-- ==============================================================================
-- MIGRACIÓN: AISLAMIENTO MULTIEMPRESA DE VEHÍCULOS POR RLS (NIVEL 2 VS NIVEL 1)
-- ==============================================================================

-- 1. Eliminar la política anterior permisiva USING (true) de lectura en vehiculos
DROP POLICY IF EXISTS "Permitir lectura de vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Permitir lectura de vehiculos acotada por servicio" ON public.vehiculos;

-- 2. Crear la política RLS definitiva de SELECT para vehiculos
-- Reglas de acceso:
-- - Nivel 1 (Superusuario): Acceso global total a todas las empresas y vehículos (level = 1).
-- - Nivel 2 (Empresa Contratante): Acceso acotado a los taxis pertenecientes a su servicio_id (level = 2 AND servicio_id = get_user_servicio_id()).
-- - Conductores: Acceso a taxis asignados a su tercero (driver_id).
-- - Propietarios: Acceso a taxis vinculados a su tercero (owner_id).
CREATE POLICY "Permitir lectura de vehiculos acotada por servicio" 
ON public.vehiculos 
FOR SELECT 
TO authenticated
USING (
  public.get_user_service_level() = 1
  OR (public.get_user_service_level() = 2 AND servicio_id = public.get_user_servicio_id())
  OR driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
  OR owner_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
);
