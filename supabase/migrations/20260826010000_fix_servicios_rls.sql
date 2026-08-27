-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - POLÍTICAS RLS PARA TABLA `servicios`
-- Permite consultar, auto-crear y administrar registros en public.servicios
-- ====================================================================

-- 1. Habilitar RLS en la tabla servicios
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas previas para evitar conflictos
DROP POLICY IF EXISTS "Authenticated view servicios" ON public.servicios;
DROP POLICY IF EXISTS "Admin update servicios" ON public.servicios;
DROP POLICY IF EXISTS "Permitir lectura de servicios" ON public.servicios;
DROP POLICY IF EXISTS "Permitir creacion de servicios" ON public.servicios;
DROP POLICY IF EXISTS "Permitir actualizacion de servicios" ON public.servicios;
DROP POLICY IF EXISTS "Permitir eliminacion de servicios" ON public.servicios;

-- 3. Política SELECT: Permitir lectura de la tabla servicios a usuarios autenticados y anónimos
CREATE POLICY "Permitir lectura de servicios"
ON public.servicios
FOR SELECT
TO authenticated, anon
USING (true);

-- 4. Política INSERT: Permitir la creación de servicios al registrarse o iniciar sesión
CREATE POLICY "Permitir creacion de servicios"
ON public.servicios
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 5. Política UPDATE: Permitir actualizar servicios a Administradores (nivel <= 2) o al dueño del tercero vinculado
CREATE POLICY "Permitir actualizacion de servicios"
ON public.servicios
FOR UPDATE
TO authenticated, anon
USING (
  public.get_user_service_level() <= 2 OR tercero_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
)
WITH CHECK (
  public.get_user_service_level() <= 2 OR tercero_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
);

-- 6. Política DELETE: Permitir eliminación de servicios solo a Administradores (nivel 1)
CREATE POLICY "Permitir eliminacion de servicios"
ON public.servicios
FOR DELETE
TO authenticated
USING (public.get_user_service_level() = 1);
