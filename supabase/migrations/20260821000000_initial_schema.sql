-- ====================================================================
-- MAQUITAXIS DATABASE SCHEMA MIGRATION (BASADO EN MAQUIDB.MD)
-- Database: PostgreSQL / Supabase
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TABLA: TERCEROS (Personas, Empresas, Conductores, Proveedores, Propietarios)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.terceros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL DEFAULT 'CC',
  doc_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  email TEXT,
  nequi_number TEXT,
  whatsapp_number TEXT,
  birth_date DATE,
  driver_license_number TEXT,
  driver_license_expiration DATE,
  -- Roles por booleano (Un tercero puede tener múltiples roles)
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  is_service_client BOOLEAN NOT NULL DEFAULT FALSE,
  is_driver BOOLEAN NOT NULL DEFAULT FALSE,
  is_supplier BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. TABLA: SERVICIOS (Clientes contratantes de la App con Nivel de Acceso)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tercero_id UUID NOT NULL REFERENCES public.terceros(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('activo', 'inactivo')) DEFAULT 'activo',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3, 4)) DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. TABLA: MARCAS (Catálogo de marcas de vehículos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. TABLA: VEHICULOS (Taxis / Vehículos administrados)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.terceros(id) ON DELETE RESTRICT,
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
  model TEXT NOT NULL,
  displacement TEXT,
  fuel_type TEXT,
  passenger_capacity INTEGER DEFAULT 4,
  serial_number TEXT,
  chassis_number TEXT,
  engine_number TEXT,
  color TEXT,
  affiliated_company_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
  marca_id UUID REFERENCES public.marcas(id) ON DELETE SET NULL,
  operation_card_number TEXT,
  operation_card_expedition DATE,
  operation_card_validity_start DATE,
  operation_card_validity_end DATE,
  daily_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_shift_time TIME DEFAULT '05:00:00',
  end_shift_time TIME DEFAULT '19:00:00',
  savings_amount NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('disponible', 'en_servicio', 'fuera_de_servicio', 'sin_conexion')) DEFAULT 'fuera_de_servicio',
  last_known_lat DOUBLE PRECISION,
  last_known_lng DOUBLE PRECISION,
  last_location_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. TABLA: TARJETA_OPERA (Requisitos de documentos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tarjeta_opera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_count INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. TABLA: EVENTOS (Catálogo de eventos fijos / mantenimiento preventivo)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  kms_interval INTEGER DEFAULT 0,
  estimated_value NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. TABLA: PRODUCCION (Registro diario del producido del vehículo)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('trabajo', 'pico_y_placa', 'taller', 'descanso')) DEFAULT 'trabajo',
  mileage INTEGER DEFAULT 0,
  savings_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 8. TABLA: CONTROL (Control de eventos fijos ejecutados)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE RESTRICT,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  unit_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  current_mileage INTEGER NOT NULL DEFAULT 0,
  next_change_mileage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. TABLA: MANTENIMIENTO (Mantenimientos generales e imprevistos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mantenimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.terceros(id) ON DELETE RESTRICT,
  detail TEXT NOT NULL,
  total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  current_mileage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. TABLA: MESES (Catálogo de meses)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  total_days INTEGER NOT NULL
);

-- --------------------------------------------------------------------
-- 11. TABLA: S_SOCIAL (Pago de seguridad social del conductor)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.s_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id UUID NOT NULL REFERENCES public.terceros(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  month_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  days_paid INTEGER NOT NULL DEFAULT 30,
  payment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  mes_id INTEGER NOT NULL REFERENCES public.meses(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 12. TABLA: LIQUIDACION (Liquidaciones de conductores)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.liquidacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id UUID NOT NULL REFERENCES public.terceros(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 13. TABLAS DE SEGUIMIENTO GPS EN TIEMPO REAL
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  driver_tercero_id UUID NOT NULL REFERENCES public.terceros(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  total_distance_meters DOUBLE PRECISION DEFAULT 0,
  total_positions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gps_positions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ÍNDICES PARA RENDIMIENTO
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_terceros_doc ON public.terceros(doc_number);
CREATE INDEX IF NOT EXISTS idx_servicios_tercero ON public.servicios(tercero_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_plate ON public.vehiculos(plate);
CREATE INDEX IF NOT EXISTS idx_vehiculos_servicio ON public.vehiculos(servicio_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_driver ON public.vehiculos(driver_id);
CREATE INDEX IF NOT EXISTS idx_produccion_vehiculo_date ON public.produccion(vehiculo_id, date);
CREATE INDEX IF NOT EXISTS idx_control_vehiculo ON public.control(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_gps_positions_session_time ON public.gps_positions(session_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_positions_vehiculo_time ON public.gps_positions(vehiculo_id, recorded_at DESC);

-- ====================================================================
-- FUNCIONES Y POLÍTICAS RLS DE SEGURIDAD
-- ====================================================================
ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarjeta_opera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.s_social ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_positions ENABLE ROW LEVEL SECURITY;

-- Función helper para consultar nivel de servicio del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_service_level()
RETURNS INTEGER AS $$
DECLARE
  v_level INTEGER;
BEGIN
  SELECT s.level INTO v_level
  FROM public.servicios s
  JOIN public.terceros t ON t.id = s.tercero_id
  WHERE t.user_id = auth.uid() AND s.status = 'activo'
  LIMIT 1;

  IF v_level IS NULL THEN
    RETURN 3; -- Conductor por defecto si no tiene servicio registrado
  END IF;

  RETURN v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICAS GENERALES DE SEGURIDAD (Autenticados pueden leer catálogos)
CREATE POLICY "Public read catalog marcas" ON public.marcas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Public read catalog eventos" ON public.eventos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Public read catalog meses" ON public.meses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Public read catalog tarjeta_opera" ON public.tarjeta_opera FOR SELECT TO authenticated USING (TRUE);

-- POLÍTICAS TERCEROS, SERVICIOS Y VEHICULOS
CREATE POLICY "Authenticated view terceros" ON public.terceros FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/Owners update terceros" ON public.terceros FOR ALL TO authenticated USING (public.get_user_service_level() <= 2);

CREATE POLICY "Authenticated view servicios" ON public.servicios FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin update servicios" ON public.servicios FOR ALL TO authenticated USING (public.get_user_service_level() = 1);

CREATE POLICY "Authenticated view vehiculos" ON public.vehiculos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/Owners manage vehiculos" ON public.vehiculos FOR ALL TO authenticated USING (public.get_user_service_level() <= 2);

-- POLÍTICAS PRODUCCION
CREATE POLICY "Drivers and Admins view produccion" ON public.produccion FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Drivers insert/update own produccion" ON public.produccion FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Drivers update own produccion" ON public.produccion FOR UPDATE TO authenticated USING (TRUE);

-- POLÍTICAS TRACKING SESSIONS Y GPS POSITIONS
CREATE POLICY "View tracking sessions" ON public.tracking_sessions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Manage tracking sessions" ON public.tracking_sessions FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "View gps positions" ON public.gps_positions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Insert gps positions" ON public.gps_positions FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ====================================================================
-- HABILITAR REALTIME PARA NAVEGACIÓN EN TIEMPO REAL
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehiculos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gps_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produccion;
