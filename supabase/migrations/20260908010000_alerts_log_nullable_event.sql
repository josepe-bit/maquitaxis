-- Migration: 20260908010000_alerts_log_nullable_event.sql
-- Description: Allow evento_id to be NULLABLE in public.event_alerts_log to support legal document alerts (e.g. Driver License) not tied to public.eventos catalog rows.

ALTER TABLE public.event_alerts_log
  ALTER COLUMN evento_id DROP NOT NULL;
