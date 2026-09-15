-- Migration: 20260920000000_enable_rls_event_alerts_log.sql
-- Description: Enable Row-Level Security on public.event_alerts_log (Zero Policies / Strict Backend Only)

ALTER TABLE public.event_alerts_log ENABLE ROW LEVEL SECURITY;
