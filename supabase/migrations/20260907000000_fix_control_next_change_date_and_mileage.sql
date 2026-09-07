-- ====================================================================
-- MIGRACIÓN: REGLA DE NEGOCIO Y CAMPOS DE CONTROL Y EVENTOS
-- ====================================================================

-- 1. Asegurar campo months_interval en la tabla eventos
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS months_interval INTEGER DEFAULT 0;

-- 2. Asegurar campo next_change_date en la tabla control
ALTER TABLE public.control
  ADD COLUMN IF NOT EXISTS next_change_date DATE NULL;

-- 3. Permitir NULL en next_change_mileage para eventos sin periodicidad de km
ALTER TABLE public.control
  ALTER COLUMN next_change_mileage DROP NOT NULL,
  ALTER COLUMN next_change_mileage SET DEFAULT NULL;

-- 4. Notificar a PostgREST para recargar el schema cache inmediatamente
NOTIFY pgrst, 'reload schema';
