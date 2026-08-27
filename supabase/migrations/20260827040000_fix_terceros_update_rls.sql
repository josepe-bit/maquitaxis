-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - CORREGIR POLÍTICA UPDATE EN TABLA `terceros`
-- Permite vincular el user_id al registrarse cuando el tercero ya existe por número de documento (user_id es NULL)
-- ====================================================================

DROP POLICY IF EXISTS "Permitir actualizacion de terceros" ON public.terceros;

CREATE POLICY "Permitir actualizacion de terceros"
ON public.terceros
FOR UPDATE
TO authenticated, anon
USING (
  user_id IS NULL OR user_id = auth.uid() OR public.get_user_service_level() <= 2
)
WITH CHECK (
  true
);
