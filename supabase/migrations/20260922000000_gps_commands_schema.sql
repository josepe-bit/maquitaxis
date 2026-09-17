-- Migration: 20260922000000_gps_commands_schema.sql
-- Descripción: Tabla de comandos remotos para el servicio GPS y su publicación en Supabase Realtime

CREATE TABLE IF NOT EXISTS public.gps_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
    driver_tercero_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
    command TEXT NOT NULL CHECK (command IN ('ACTIVAR_GPS', 'DESACTIVAR_GPS')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
    requested_by UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    executed_at TIMESTAMPTZ
);

-- Índices de consulta frecuente por vehículo y estado
CREATE INDEX IF NOT EXISTS idx_gps_commands_vehiculo_status ON public.gps_commands (vehiculo_id, status);

-- Habilitar RLS
ALTER TABLE public.gps_commands ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Permitir lectura de comandos a usuarios autenticados"
ON public.gps_commands
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir insercion de comandos a usuarios autenticados"
ON public.gps_commands
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de comandos a usuarios autenticados"
ON public.gps_commands
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Agregar la tabla a la publicación de Supabase Realtime
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gps_commands;
    END IF;
END $$;
