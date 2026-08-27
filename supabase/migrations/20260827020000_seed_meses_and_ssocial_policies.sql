-- ====================================================================
-- MIGRACIÓN: POBLAR TABLA MESES Y REGULARIZAR RLS EN S_SOCIAL
-- ====================================================================

-- 1. Poblar catálogo de meses si no existen
INSERT INTO public.meses (id, name, total_days) VALUES
  (1, 'Enero', 31),
  (2, 'Febrero', 28),
  (3, 'Marzo', 31),
  (4, 'Abril', 30),
  (5, 'Mayo', 31),
  (6, 'Junio', 30),
  (7, 'Julio', 31),
  (8, 'Agosto', 31),
  (9, 'Septiembre', 30),
  (10, 'Octubre', 31),
  (11, 'Noviembre', 30),
  (12, 'Diciembre', 31)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  total_days = EXCLUDED.total_days;

-- 2. Asegurar políticas RLS para s_social
ALTER TABLE public.s_social ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated view s_social" ON public.s_social;
DROP POLICY IF EXISTS "Authenticated insert s_social" ON public.s_social;
DROP POLICY IF EXISTS "Authenticated update s_social" ON public.s_social;
DROP POLICY IF EXISTS "Authenticated delete s_social" ON public.s_social;

CREATE POLICY "Authenticated view s_social" ON public.s_social FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated insert s_social" ON public.s_social FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated update s_social" ON public.s_social FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated delete s_social" ON public.s_social FOR DELETE TO authenticated USING (TRUE);
