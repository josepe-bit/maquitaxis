-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - TABLA DE CARRERAS / SERVICIOS DE TAXI
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.carreras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'asignado', 'aceptado', 'en_curso', 'completado', 'cancelado')) DEFAULT 'pendiente',
  cancel_reason TEXT,
  vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE SET NULL,
  driver_tercero_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  tracking_session_id UUID REFERENCES public.tracking_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_carreras_status ON public.carreras(status);
CREATE INDEX IF NOT EXISTS idx_carreras_vehiculo ON public.carreras(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_carreras_driver ON public.carreras(driver_tercero_id);
CREATE INDEX IF NOT EXISTS idx_carreras_created_at ON public.carreras(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.carreras ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- 1. Lectura para cualquier usuario autenticado (conductores y administradores)
CREATE POLICY "Authenticated view carreras" ON public.carreras
  FOR SELECT TO authenticated USING (TRUE);

-- 2. Administradores/Despachadores pueden crear y gestionar todas las carreras
CREATE POLICY "Admins manage carreras" ON public.carreras
  FOR ALL TO authenticated USING (public.get_user_service_level() <= 2);

-- 3. Conductores pueden actualizar carreras asignadas a su tercero
CREATE POLICY "Drivers update own assigned carreras" ON public.carreras
  FOR UPDATE TO authenticated USING (
    driver_tercero_id IN (
      SELECT id FROM public.terceros WHERE user_id = auth.uid()
    )
  );

-- Habilitar Supabase Realtime para la tabla carreras
ALTER PUBLICATION supabase_realtime ADD TABLE public.carreras;
