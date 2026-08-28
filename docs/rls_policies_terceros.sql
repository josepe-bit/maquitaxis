S
-- ====================================================================
-- MAQUITAXIS - POLÍTICAS RLS PARA LA TABLA `terceros`
-- Habilita operaciones de Registro (INSERT), Verificación (SELECT),
-- Actualización (UPDATE) y Eliminación por Admin (DELETE).
-- ====================================================================

-- 1. Habilitar RLS en la tabla terceros
ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas previas si existen para evitar conflictos
DROP POLICY IF EXISTS "Authenticated view terceros" ON public.terceros;
DROP POLICY IF EXISTS "Admin/Owners update terceros" ON public.terceros;
DROP POLICY IF EXISTS "Permitir lectura de terceros propia o verificacion" ON public.terceros;
DROP POLICY IF EXISTS "Permitir lectura de terceros para verificacion y consulta" ON public.terceros;
DROP POLICY IF EXISTS "Permitir insercion de terceros al registrarse" ON public.terceros;
DROP POLICY IF EXISTS "Permitir actualizacion del propio tercero" ON public.terceros;
DROP POLICY IF EXISTS "Permitir actualizacion de terceros" ON public.terceros;
DROP POLICY IF EXISTS "Permitir eliminacion de terceros por admins" ON public.terceros;

-- 3. Política SELECT: Permitir consultar terceros (Verificación y consulta general)
CREATE POLICY "Permitir lectura de terceros para verificacion y consulta"
ON public.terceros
FOR SELECT
TO authenticated, anon
USING (true);

-- 4. Política INSERT: Permitir creación de nuevos terceros durante el registro
CREATE POLICY "Permitir insercion de terceros al registrarse"
ON public.terceros
FOR INSERT
TO authenticated, anon
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 5. Política UPDATE: Permitir actualización de sus propios datos o por Administradores
CREATE POLICY "Permitir actualizacion de terceros"
ON public.terceros
FOR UPDATE
TO authenticated, anon
USING (
  user_id = auth.uid() OR public.get_user_service_level() <= 2
)
WITH CHECK (
  user_id = auth.uid() OR public.get_user_service_level() <= 2
);

-- 6. Política DELETE: Permitir eliminación únicamente por Administradores / Gestores
CREATE POLICY "Permitir eliminacion de terceros por admins"
ON public.terceros
FOR DELETE
TO authenticated
USING (public.get_user_service_level() <= 2);
