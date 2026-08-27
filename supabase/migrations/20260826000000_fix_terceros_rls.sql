-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - POLÍTICAS RLS PARA TABLA `terceros`
-- Soluciona el error: "new row violates row-level security policy for table 'terceros'"
-- ====================================================================

-- 1. Habilitar RLS en la tabla terceros
ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas previas si existen para evitar duplicaciones o conflictos
DROP POLICY IF EXISTS "Authenticated view terceros" ON public.terceros;
DROP POLICY IF EXISTS "Admin/Owners update terceros" ON public.terceros;
DROP POLICY IF EXISTS "Permitir lectura de terceros propia o verificacion" ON public.terceros;
DROP POLICY IF EXISTS "Permitir lectura de terceros para verificacion y consulta" ON public.terceros;
DROP POLICY IF EXISTS "Permitir insercion de terceros al registrarse" ON public.terceros;
DROP POLICY IF EXISTS "Permitir actualizacion del propio tercero" ON public.terceros;
DROP POLICY IF EXISTS "Permitir actualizacion de terceros" ON public.terceros;
DROP POLICY IF EXISTS "Permitir eliminacion de terceros por admins" ON public.terceros;

-- 3. Política SELECT: Permitir lectura de la tabla terceros a usuarios autenticados y anónimos
CREATE POLICY "Permitir lectura de terceros para verificacion y consulta"
ON public.terceros
FOR SELECT
TO authenticated, anon
USING (true);

-- 4. Política INSERT: Permitir la creación de nuevos registros en la tabla terceros al registrarse
-- (Nota: Se establece WITH CHECK (true) porque inmediatamente tras signUp(), la petición HTTP de inserción se realiza bajo el rol anon o antes de adjuntar el token JWT de sesión)
CREATE POLICY "Permitir insercion de terceros al registrarse"
ON public.terceros
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 5. Política UPDATE: Permitir actualizar el propio tercero o permitir a Administradores (nivel <= 2)
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

-- 6. Política DELETE: Permitir la eliminación solo a Administradores / Gestores (nivel <= 2)
CREATE POLICY "Permitir eliminacion de terceros por admins"
ON public.terceros
FOR DELETE
TO authenticated
USING (public.get_user_service_level() <= 2);
