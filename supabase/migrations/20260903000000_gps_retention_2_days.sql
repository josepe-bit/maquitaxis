-- =============================================================================
-- MIGRACIÓN: RETENCIÓN AUTOMÁTICA DE 2 DÍAS GPS (HOY + AYER AMERICA/BOGOTA)
-- =============================================================================

-- 1. Crear índice B-Tree sobre recorded_at para optimizar eliminación por fecha
CREATE INDEX IF NOT EXISTS idx_gps_positions_recorded_at 
ON public.gps_positions USING btree (recorded_at);

-- 2. Función SQL de Limpieza de Posiciones Antiguas
CREATE OR REPLACE FUNCTION public.clean_old_gps_positions()
RETURNS TABLE (deleted_count bigint, cutoff_used timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff timestamptz;
  v_deleted bigint;
BEGIN
  -- Calcular inicio del día anterior en Colombia (America/Bogota) a las 00:00:00
  v_cutoff := (date_trunc('day', NOW() AT TIME ZONE 'America/Bogota' - INTERVAL '1 day') AT TIME ZONE 'America/Bogota');

  -- Eliminar únicamente posiciones estrictamente anteriores al inicio del día de ayer
  DELETE FROM public.gps_positions
  WHERE recorded_at < v_cutoff;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_deleted, v_cutoff;
END;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.clean_old_gps_positions() TO service_role;
GRANT EXECUTE ON FUNCTION public.clean_old_gps_positions() TO authenticated;

-- 3. Habilitar extensión pg_cron y programar Job Diario a las 03:15 AM Colombia (08:15 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job') THEN
    PERFORM cron.unschedule('clean-old-gps-positions-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clean-old-gps-positions-daily');

    PERFORM cron.schedule(
      'clean-old-gps-positions-daily',
      '15 8 * * *',
      'SELECT public.clean_old_gps_positions();'
    );
  END IF;
END $$;
