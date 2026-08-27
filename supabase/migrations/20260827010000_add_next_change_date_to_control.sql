-- ====================================================================
-- MIGRACIÓN: AÑADIR NEXT_CHANGE_DATE EN TABLA CONTROL
-- ====================================================================

ALTER TABLE public.control
  ADD COLUMN IF NOT EXISTS next_change_date DATE;

-- Comentario explicativo
COMMENT ON COLUMN public.control.next_change_date IS 'Fecha estimada para el próximo cambio o mantenimiento cuando el evento aplica por meses o por km y meses';
