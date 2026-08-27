-- ====================================================================
-- MIGRACIÓN: AÑADIR CAMPO AMOUNT Y POLÍTICAS RLS EN TABLA LIQUIDACION
-- ====================================================================

ALTER TABLE public.liquidacion
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.liquidacion.amount IS 'Valor total pagado al conductor por concepto de liquidación de prestaciones sociales';

-- Asegurar políticas RLS para la tabla liquidacion
ALTER TABLE public.liquidacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated view liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Authenticated insert liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Authenticated update liquidacion" ON public.liquidacion;
DROP POLICY IF EXISTS "Authenticated delete liquidacion" ON public.liquidacion;

CREATE POLICY "Authenticated view liquidacion" ON public.liquidacion FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated insert liquidacion" ON public.liquidacion FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated update liquidacion" ON public.liquidacion FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated delete liquidacion" ON public.liquidacion FOR DELETE TO authenticated USING (TRUE);
