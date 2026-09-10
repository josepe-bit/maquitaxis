-- Migration: 20260908020000_alerts_log_unique_null_event.sql
-- Description: Create partial unique index on event_alerts_log for NULL evento_id (legal document alerts like Driver License).

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_alerts_log_unique_null_event
ON public.event_alerts_log (
    vehiculo_id,
    cycle_anchor,
    alert_type
)
WHERE evento_id IS NULL;
