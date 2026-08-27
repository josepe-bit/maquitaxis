-- ====================================================================
-- MAQUITAXIS SEED DATA FOR LOCAL DEVELOPMENT (BASADO EN MAQUIDB.MD)
-- ====================================================================

-- 1. Insertar Catálogo de Meses
INSERT INTO public.meses (id, name, total_days) VALUES
  (1, 'Enero', 31),
  (2, 'Febrero', 28),
  (3, 'Marzo', 31),
  (4, 'Abril', 30),
  (5, 'Mayo', 31),
  (6, 'Junio', 30),
  (7, 'Julio', 31),
  (8, 'Agosto', 31),
  (9, 'Septiembre', 30),
  (10, 'Octubre', 31),
  (11, 'Noviembre', 30),
  (12, 'Diciembre', 31)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Catálogo de Marcas
INSERT INTO public.marcas (id, name, country) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Chevrolet', 'Estados Unidos'),
  ('a2222222-2222-2222-2222-222222222222', 'Hyundai', 'Corea del Sur'),
  ('a3333333-3333-3333-3333-333333333333', 'Kia', 'Corea del Sur'),
  ('a4444444-4444-4444-4444-444444444444', 'Renault', 'Francia'),
  ('a5555555-5555-5555-5555-555555555555', 'Nissan', 'Japón')
ON CONFLICT (name) DO NOTHING;

-- 3. Insertar Catálogo de Eventos de Mantenimiento Preventivo
INSERT INTO public.eventos (id, name, kms_interval, estimated_value) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Cambio de Aceite y Filtro', 5000, 140000),
  ('e2222222-2222-2222-2222-222222222222', 'Cambio de Correa de Repartición', 40000, 350000),
  ('e3333333-3333-3333-3333-333333333333', 'Cambio de Bujías', 20000, 90000),
  ('e4444444-4444-4444-4444-444444444444', 'Cambio de Llantas (Juego)', 50000, 800000),
  ('e5555555-5555-5555-5555-555555555555', 'Pago de Seguridad Social', 0, 350000)
ON CONFLICT (name) DO NOTHING;

-- 4. Insertar Requisitos de Tarjeta de Operación
INSERT INTO public.tarjeta_opera (id, document_count, description) VALUES
  ('t1111111-1111-1111-1111-111111111111', 2, 'Fotocopias de la cédula del propietario al 150%'),
  ('t2222222-2222-2222-2222-222222222222', 1, 'Fotocopia de la tarjeta de propiedad del vehículo'),
  ('t3333333-3333-3333-3333-333333333333', 1, 'Certificado de revisión técnico-mecánica vigente'),
  ('t4444444-4444-4444-4444-444444444444', 1, 'Póliza SOAT vigente')
ON CONFLICT (id) DO NOTHING;

-- 5. Insertar Terceros (Propietario, Servicio/Empresa, Conductor)
INSERT INTO public.terceros (
  id, doc_type, doc_number, name, phone, email, is_owner, is_service_client, is_driver, is_supplier
) VALUES
  -- Superadmin / Propietario de la App
  (
    'c1111111-1111-1111-1111-111111111111',
    'CC', '12345678', 'Administrador Principal',
    '+573001234567', 'admin@maquitaxis.com',
    TRUE, TRUE, FALSE, FALSE
  ),
  -- Cliente Empresa Nivel 2
  (
    'c2222222-2222-2222-2222-222222222222',
    'NIT', '900123456-1', 'Empresa Taxis SMR S.A.S.',
    '+573009876543', 'contacto@taxissmr.com',
    TRUE, TRUE, FALSE, FALSE
  ),
  -- Conductor
  (
    'c3333333-3333-3333-3333-333333333333',
    'CC', '85412369', 'Jose Omar Conductor',
    '+573015554433', 'joseomar@maquitaxis.com',
    FALSE, FALSE, TRUE, FALSE
  )
ON CONFLICT (doc_number) DO NOTHING;

-- 6. Insertar Servicios
INSERT INTO public.servicios (id, name, tercero_id, status, start_date, level) VALUES
  (
    's1111111-1111-1111-1111-111111111111',
    'MaquiTaxis Global (SuperAdmin)',
    'c1111111-1111-1111-1111-111111111111',
    'activo', CURRENT_DATE, 1
  ),
  (
    's2222222-2222-2222-2222-222222222222',
    'Servicio Taxis SMR',
    'c2222222-2222-2222-2222-222222222222',
    'activo', CURRENT_DATE, 2
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Insertar Vehículo Taxi SMR842
INSERT INTO public.vehiculos (
  id, plate, owner_id, servicio_id, model, displacement, fuel_type,
  passenger_capacity, driver_id, marca_id, daily_fee, savings_amount, status
) VALUES (
  'v1111111-1111-1111-1111-111111111111',
  'SMR842',
  'c2222222-2222-2222-2222-222222222222', -- Owner: Taxis SMR
  's2222222-2222-2222-2222-222222222222', -- Servicio: Taxis SMR
  '2022',
  '1.2L',
  'Gasolina/Gas',
  4,
  'c3333333-3333-3333-3333-333333333333', -- Conductor: Jose Omar
  'a1111111-1111-1111-1111-111111111111', -- Marca: Chevrolet
  110000, -- Cuota diaria $110.000 COP
  10000,  -- Ahorro diario sugerido $10.000 COP
  'disponible'
)
ON CONFLICT (plate) DO NOTHING;
