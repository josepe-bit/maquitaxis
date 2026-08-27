-- ====================================================================
-- MAQUITAXIS - SCRIPT UNIFICADO Y SEGURO DE POLÍTICAS RLS
-- Habilita Row-Level Security de manera condicional (si la tabla existe)
-- Evita el error ERROR 42P01: relation does not exist si una tabla no existe.
-- ====================================================================

-- 1. TABLA: TERCEROS (public.terceros)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'terceros') THEN
    ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated view terceros" ON public.terceros;
    DROP POLICY IF EXISTS "Admin/Owners update terceros" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir lectura de terceros para verificacion y consulta" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir insercion de terceros al registrarse" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir actualizacion de terceros" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir eliminacion de terceros por admins" ON public.terceros;

    CREATE POLICY "Permitir lectura de terceros para verificacion y consulta" ON public.terceros FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir insercion de terceros al registrarse" ON public.terceros FOR INSERT TO authenticated, anon WITH CHECK (true);
    CREATE POLICY "Permitir actualizacion de terceros" ON public.terceros FOR UPDATE TO authenticated, anon USING (user_id = auth.uid() OR public.get_user_service_level() <= 2) WITH CHECK (user_id = auth.uid() OR public.get_user_service_level() <= 2);
    CREATE POLICY "Permitir eliminacion de terceros por admins" ON public.terceros FOR DELETE TO authenticated USING (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 2. TABLA: SERVICIOS (public.servicios)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'servicios') THEN
    ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated view servicios" ON public.servicios;
    DROP POLICY IF EXISTS "Admin update servicios" ON public.servicios;
    DROP POLICY IF EXISTS "Permitir lectura de servicios" ON public.servicios;
    DROP POLICY IF EXISTS "Permitir creacion de servicios" ON public.servicios;
    DROP POLICY IF EXISTS "Permitir actualizacion de servicios" ON public.servicios;
    DROP POLICY IF EXISTS "Permitir eliminacion de servicios" ON public.servicios;

    CREATE POLICY "Permitir lectura de servicios" ON public.servicios FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir creacion de servicios" ON public.servicios FOR INSERT TO authenticated, anon WITH CHECK (true);
    CREATE POLICY "Permitir actualizacion de servicios" ON public.servicios FOR UPDATE TO authenticated, anon USING (public.get_user_service_level() <= 2 OR tercero_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())) WITH CHECK (public.get_user_service_level() <= 2 OR tercero_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid()));
    CREATE POLICY "Permitir eliminacion de servicios" ON public.servicios FOR DELETE TO authenticated USING (public.get_user_service_level() = 1);
  END IF;
END $$;

-- 3. TABLA: MARCAS (public.marcas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marcas') THEN
    ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read catalog marcas" ON public.marcas;
    DROP POLICY IF EXISTS "Admins manage marcas" ON public.marcas;
    DROP POLICY IF EXISTS "Authenticated manage marcas" ON public.marcas;
    DROP POLICY IF EXISTS "Permitir lectura de marcas" ON public.marcas;
    DROP POLICY IF EXISTS "Permitir gestion de marcas" ON public.marcas;

    CREATE POLICY "Permitir lectura de marcas" ON public.marcas FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir gestion de marcas" ON public.marcas FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 4. TABLA: VEHICULOS (public.vehiculos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehiculos') THEN
    ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated view vehiculos" ON public.vehiculos;
    DROP POLICY IF EXISTS "Admin/Owners manage vehiculos" ON public.vehiculos;
    DROP POLICY IF EXISTS "Permitir lectura de vehiculos" ON public.vehiculos;
    DROP POLICY IF EXISTS "Permitir gestion de vehiculos" ON public.vehiculos;

    CREATE POLICY "Permitir lectura de vehiculos" ON public.vehiculos FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir gestion de vehiculos" ON public.vehiculos FOR ALL TO authenticated USING (public.get_user_service_level() <= 2 OR driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid()) OR owner_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())) WITH CHECK (public.get_user_service_level() <= 2 OR driver_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid()) OR owner_id IN (SELECT id FROM public.terceros WHERE user_id = auth.uid()));
  END IF;
END $$;

-- 5. TABLA: TARJETA_OPERA (public.tarjeta_opera)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tarjeta_opera') THEN
    ALTER TABLE public.tarjeta_opera ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read catalog tarjeta_opera" ON public.tarjeta_opera;
    DROP POLICY IF EXISTS "Permitir lectura de tarjeta_opera" ON public.tarjeta_opera;
    DROP POLICY IF EXISTS "Permitir gestion de tarjeta_opera" ON public.tarjeta_opera;

    CREATE POLICY "Permitir lectura de tarjeta_opera" ON public.tarjeta_opera FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir gestion de tarjeta_opera" ON public.tarjeta_opera FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 6. TABLA: EVENTOS (public.eventos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'eventos') THEN
    ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read catalog eventos" ON public.eventos;
    DROP POLICY IF EXISTS "Permitir lectura de eventos" ON public.eventos;
    DROP POLICY IF EXISTS "Permitir gestion de eventos" ON public.eventos;

    CREATE POLICY "Permitir lectura de eventos" ON public.eventos FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir gestion de eventos" ON public.eventos FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 7. TABLA: PRODUCCION (public.produccion)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'produccion') THEN
    ALTER TABLE public.produccion ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Drivers and Admins view produccion" ON public.produccion;
    DROP POLICY IF EXISTS "Drivers insert/update own produccion" ON public.produccion;
    DROP POLICY IF EXISTS "Drivers update own produccion" ON public.produccion;
    DROP POLICY IF EXISTS "Permitir lectura de produccion" ON public.produccion;
    DROP POLICY IF EXISTS "Permitir insercion y actualizacion de produccion" ON public.produccion;
    DROP POLICY IF EXISTS "Permitir actualizacion de produccion" ON public.produccion;
    DROP POLICY IF EXISTS "Permitir eliminacion de produccion por admins" ON public.produccion;

    CREATE POLICY "Permitir lectura de produccion" ON public.produccion FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Permitir insercion y actualizacion de produccion" ON public.produccion FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Permitir actualizacion de produccion" ON public.produccion FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Permitir eliminacion de produccion por admins" ON public.produccion FOR DELETE TO authenticated USING (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 8. TABLA: CONTROL (public.control)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'control') THEN
    ALTER TABLE public.control ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir lectura de control" ON public.control;
    DROP POLICY IF EXISTS "Permitir gestion de control" ON public.control;

    CREATE POLICY "Permitir lectura de control" ON public.control FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Permitir gestion de control" ON public.control FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 9. TABLA: MANTENIMIENTO (public.mantenimiento)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mantenimiento') THEN
    ALTER TABLE public.mantenimiento ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir lectura de mantenimiento" ON public.mantenimiento;
    DROP POLICY IF EXISTS "Permitir gestion de mantenimiento" ON public.mantenimiento;

    CREATE POLICY "Permitir lectura de mantenimiento" ON public.mantenimiento FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Permitir gestion de mantenimiento" ON public.mantenimiento FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 10. TABLA: MESES (public.meses)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meses') THEN
    ALTER TABLE public.meses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read catalog meses" ON public.meses;
    DROP POLICY IF EXISTS "Permitir lectura de meses" ON public.meses;
    DROP POLICY IF EXISTS "Permitir gestion de meses" ON public.meses;

    CREATE POLICY "Permitir lectura de meses" ON public.meses FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir gestion de meses" ON public.meses FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 11. TABLA: S_SOCIAL (public.s_social)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 's_social') THEN
    ALTER TABLE public.s_social ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir lectura de s_social" ON public.s_social;
    DROP POLICY IF EXISTS "Permitir gestion de s_social" ON public.s_social;

    CREATE POLICY "Permitir lectura de s_social" ON public.s_social FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Permitir gestion de s_social" ON public.s_social FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 12. TABLA: LIQUIDACION (public.liquidacion)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'liquidacion') THEN
    ALTER TABLE public.liquidacion ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir lectura de liquidacion" ON public.liquidacion;
    DROP POLICY IF EXISTS "Permitir gestion de liquidacion" ON public.liquidacion;

    CREATE POLICY "Permitir lectura de liquidacion" ON public.liquidacion FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Permitir gestion de liquidacion" ON public.liquidacion FOR ALL TO authenticated USING (public.get_user_service_level() <= 2) WITH CHECK (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 13. TABLA: TRACKING_SESSIONS (public.tracking_sessions)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tracking_sessions') THEN
    ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "View tracking sessions" ON public.tracking_sessions;
    DROP POLICY IF EXISTS "Permitir lectura de tracking_sessions" ON public.tracking_sessions;
    DROP POLICY IF EXISTS "Permitir gestion de tracking_sessions" ON public.tracking_sessions;

    CREATE POLICY "Permitir lectura de tracking_sessions" ON public.tracking_sessions FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir gestion de tracking_sessions" ON public.tracking_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 14. TABLA: GPS_POSITIONS (public.gps_positions)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gps_positions') THEN
    ALTER TABLE public.gps_positions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir lectura de gps_positions" ON public.gps_positions;
    DROP POLICY IF EXISTS "Permitir insercion de gps_positions" ON public.gps_positions;
    DROP POLICY IF EXISTS "Permitir eliminacion de gps_positions" ON public.gps_positions;

    CREATE POLICY "Permitir lectura de gps_positions" ON public.gps_positions FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir insercion de gps_positions" ON public.gps_positions FOR INSERT TO authenticated, anon WITH CHECK (true);
    CREATE POLICY "Permitir eliminacion de gps_positions" ON public.gps_positions FOR DELETE TO authenticated USING (public.get_user_service_level() <= 2);
  END IF;
END $$;

-- 15. TABLA: CARRERAS (public.carreras)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'carreras') THEN
    ALTER TABLE public.carreras ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated view carreras" ON public.carreras;
    DROP POLICY IF EXISTS "Admins manage carreras" ON public.carreras;
    DROP POLICY IF EXISTS "Drivers update own assigned carreras" ON public.carreras;
    DROP POLICY IF EXISTS "Permitir lectura de carreras" ON public.carreras;
    DROP POLICY IF EXISTS "Permitir creacion de carreras" ON public.carreras;
    DROP POLICY IF EXISTS "Permitir actualizacion de carreras" ON public.carreras;
    DROP POLICY IF EXISTS "Permitir eliminacion de carreras" ON public.carreras;

    CREATE POLICY "Permitir lectura de carreras" ON public.carreras FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Permitir creacion de carreras" ON public.carreras FOR INSERT TO authenticated, anon WITH CHECK (true);
    CREATE POLICY "Permitir actualizacion de carreras" ON public.carreras FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
    CREATE POLICY "Permitir eliminacion de carreras" ON public.carreras FOR DELETE TO authenticated USING (public.get_user_service_level() <= 2);
  END IF;
END $$;
