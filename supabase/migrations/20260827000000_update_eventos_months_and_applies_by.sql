-- ====================================================================
-- MIGRACIÓN: AÑADIR MESES E TIPO DE APLICACIÓN EN TABLA EVENTOS
-- ====================================================================

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS months_interval INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applies_by TEXT DEFAULT 'kilometros'
    CHECK (applies_by IN ('kilometros', 'meses', 'kilometros_y_meses', 'ninguno'));

-- Comentarios explicativos
COMMENT ON COLUMN public.eventos.months_interval IS 'Frecuencia o periodicidad en meses para que suceda el evento (ej. Tecnomecánica cada 12 meses)';
COMMENT ON COLUMN public.eventos.applies_by IS 'Criterio de aplicación: kilometros, meses, kilometros_y_meses, ninguno';
