-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - POLÍTICAS RLS Y DATOS SEMILLA PARA MARCAS
-- ====================================================================

-- 1. Políticas RLS para gestión completa de la tabla public.marcas
CREATE POLICY "Admins manage marcas" ON public.marcas
  FOR ALL TO authenticated USING (public.get_user_service_level() <= 2);

CREATE POLICY "Authenticated manage marcas" ON public.marcas
  FOR ALL TO authenticated USING (TRUE);

-- 2. Datos Semilla Iniciales (Catálogo de marcas comunes en el gremio de taxis)
INSERT INTO public.marcas (name, country)
VALUES
  ('Hyundai', 'Corea del Sur'),
  ('Kia', 'Corea del Sur'),
  ('Chevrolet', 'Estados Unidos'),
  ('Renault', 'Francia'),
  ('Nissan', 'Japón'),
  ('Toyota', 'Japón'),
  ('Suzuki', 'Japón'),
  ('Volkswagen', 'Alemania'),
  ('BYD', 'China'),
  ('JAC', 'China')
ON CONFLICT (name) DO NOTHING;
