-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - ETAPA 1 FINAL
-- REGISTRO SEGURO, ROLES, APROBACIÓN DE ACCESO Y BACKFILL SEGURO
-- ====================================================================

-- 1. Agregar la columna access_status a la tabla terceros con DEFAULT 'pending'
ALTER TABLE public.terceros 
ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'pending'
CHECK (access_status IN ('pending', 'approved', 'rejected'));

-- 2. Asegurar Unicidad de user_id en la tabla terceros
CREATE UNIQUE INDEX IF NOT EXISTS terceros_user_id_unique_idx 
ON public.terceros (user_id) 
WHERE user_id IS NOT NULL;

-- 3. Backfill Seguro Refinado para Usuarios Existentes Legítimos
UPDATE public.terceros t
SET access_status = 'approved'
FROM auth.users u
WHERE t.user_id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.servicios s 
      WHERE s.tercero_id = t.id AND s.status = 'activo' AND s.level IN (1, 2)
    )
    OR
    (t.is_driver = TRUE)
  );

-- 4. RPC Autenticada Idempotente para Perfilado en Primer Login
CREATE OR REPLACE FUNCTION public.setup_user_profile_on_first_login(
  p_doc_type TEXT,
  p_doc_number TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_confirmed_at TIMESTAMPTZ;
  v_doc_clean TEXT := trim(p_doc_number);
  v_existing_tercero_id UUID;
  v_existing_user_id UUID;
  v_existing_email TEXT;
  v_existing_status TEXT;
  v_tercero_id UUID;
  v_is_driver BOOLEAN := (p_role = 'CONDUCTOR');
  v_is_service_client BOOLEAN := (p_role = 'NIVEL_1' OR p_role = 'NIVEL_2');
  v_is_owner BOOLEAN := (p_role = 'NIVEL_1');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: Usuario no autenticado.';
  END IF;

  SELECT email, email_confirmed_at INTO v_user_email, v_confirmed_at FROM auth.users WHERE id = v_user_id;

  IF v_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: Debes confirmar tu correo electrónico antes de activar tu perfil.';
  END IF;

  -- Idempotencia: Si ya está vinculado a este auth.uid(), retornar su estado actual sin alterar nada
  SELECT id, access_status INTO v_tercero_id, v_existing_status FROM public.terceros WHERE user_id = v_user_id LIMIT 1;
  IF v_tercero_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'tercero_id', v_tercero_id, 'access_status', v_existing_status, 'is_new', false);
  END IF;

  -- Buscar por número de documento
  SELECT id, user_id, email, access_status INTO v_existing_tercero_id, v_existing_user_id, v_existing_email, v_existing_status
  FROM public.terceros WHERE doc_number = v_doc_clean LIMIT 1;

  IF v_existing_tercero_id IS NOT NULL THEN
    IF v_existing_user_id IS NOT NULL AND v_existing_user_id != v_user_id THEN
      RAISE EXCEPTION 'El número de identificación ya se encuentra registrado y vinculado a otra cuenta.';
    END IF;

    IF v_existing_email IS NOT NULL AND LOWER(trim(v_existing_email)) != LOWER(v_user_email) THEN
      RAISE EXCEPTION 'El correo electrónico de tu cuenta no coincide con el registrado para este documento por la administración.';
    END IF;

    IF v_existing_email IS NULL THEN
      RAISE EXCEPTION 'El número de identificación requiere asignación previa de correo por el Administrador antes de activar la cuenta.';
    END IF;

    -- Si ya fue procesado antes o rechazado/aprobado, mantener su estado
    v_existing_status := COALESCE(v_existing_status, 'pending');

    UPDATE public.terceros
    SET user_id = v_user_id, email = v_user_email, access_status = v_existing_status, updated_at = NOW()
    WHERE id = v_existing_tercero_id;
    v_tercero_id := v_existing_tercero_id;
  ELSE
    INSERT INTO public.terceros (
      doc_type, doc_number, name, phone, email, user_id,
      is_owner, is_service_client, is_driver, is_supplier, access_status
    ) VALUES (
      COALESCE(NULLIF(p_doc_type, ''), 'CC'), v_doc_clean, trim(p_name),
      NULLIF(trim(p_phone), ''), v_user_email, v_user_id,
      v_is_owner, v_is_service_client, v_is_driver, FALSE, 'pending'
    ) RETURNING id INTO v_tercero_id;
    v_existing_status := 'pending';
  END IF;

  RETURN jsonb_build_object('success', true, 'tercero_id', v_tercero_id, 'access_status', v_existing_status, 'is_new', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RPC Autenticada para Aprobación por parte de Administrador Nivel 1
CREATE OR REPLACE FUNCTION public.approve_user_by_admin(
  p_target_tercero_id UUID,
  p_approved_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_service_level INTEGER := public.get_user_service_level();
  v_caller_tercero_id UUID;
  v_target_user_id UUID;
  v_service_level INTEGER;
  v_service_name TEXT;
  v_target_name TEXT;
BEGIN
  IF v_caller_service_level != 1 THEN
    RAISE EXCEPTION 'Acceso denegado: Solo un Administrador Nivel 1 puede aprobar usuarios.';
  END IF;

  IF p_approved_role NOT IN ('NIVEL_1', 'NIVEL_2', 'CONDUCTOR') THEN
    RAISE EXCEPTION 'Acceso denegado: El rol aprobado es inválido. Debe ser NIVEL_1, NIVEL_2 o CONDUCTOR.';
  END IF;

  SELECT id INTO v_caller_tercero_id FROM public.terceros WHERE user_id = auth.uid() LIMIT 1;
  IF v_caller_tercero_id = p_target_tercero_id THEN
    RAISE EXCEPTION 'Acceso denegado: Un Administrador no puede aprobarse a sí mismo.';
  END IF;

  SELECT name, user_id INTO v_target_name, v_target_user_id FROM public.terceros WHERE id = p_target_tercero_id;
  IF v_target_name IS NULL THEN
    RAISE EXCEPTION 'El tercero especificado no existe.';
  END IF;

  -- Actualizar tercero a Aprobado y ajustar banderas según el rol aprobado
  UPDATE public.terceros
  SET 
    access_status = 'approved',
    is_driver = (p_approved_role = 'CONDUCTOR'),
    is_service_client = (p_approved_role = 'NIVEL_1' OR p_approved_role = 'NIVEL_2'),
    is_owner = (p_approved_role = 'NIVEL_1'),
    updated_at = NOW()
  WHERE id = p_target_tercero_id;

  -- Gestionar Servicios según el Rol Aprobado (Opción 2: Crear/Activar solo al aprobar)
  IF p_approved_role = 'NIVEL_1' OR p_approved_role = 'NIVEL_2' THEN
    v_service_level := CASE WHEN p_approved_role = 'NIVEL_1' THEN 1 ELSE 2 END;
    v_service_name := CASE WHEN p_approved_role = 'NIVEL_1' 
      THEN 'Servicio Administrador - ' || v_target_name
      ELSE 'Empresa / Flota - ' || v_target_name
    END;

    IF EXISTS (SELECT 1 FROM public.servicios WHERE tercero_id = p_target_tercero_id) THEN
      UPDATE public.servicios
      SET status = 'activo', level = v_service_level, name = v_service_name, updated_at = NOW()
      WHERE tercero_id = p_target_tercero_id;
    ELSE
      INSERT INTO public.servicios (name, tercero_id, level, status, start_date)
      VALUES (v_service_name, p_target_tercero_id, v_service_level, 'activo', CURRENT_DATE);
    END IF;
  ELSE
    -- Si es Conductor, asegurar que NO exista un servicio activo (desactivar cualquier historial)
    UPDATE public.servicios SET status = 'inactivo', updated_at = NOW() WHERE tercero_id = p_target_tercero_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Usuario aprobado exitosamente.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Helper Nivel de Servicio Aprobado
CREATE OR REPLACE FUNCTION public.get_user_service_level()
RETURNS INTEGER AS $$
DECLARE
  v_level INTEGER;
BEGIN
  SELECT s.level INTO v_level
  FROM public.servicios s
  JOIN public.terceros t ON t.id = s.tercero_id
  WHERE t.user_id = auth.uid() 
    AND t.access_status = 'approved'
    AND s.status = 'activo'
  LIMIT 1;

  IF v_level IS NULL THEN
    RETURN 3; -- Default Level 3 (Restringido / Conductor)
  END IF;

  RETURN v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Helper ID Servicio Aprobado
CREATE OR REPLACE FUNCTION public.get_user_servicio_id()
RETURNS UUID AS $$
DECLARE
  v_servicio_id UUID;
BEGIN
  SELECT s.id INTO v_servicio_id
  FROM public.servicios s
  JOIN public.terceros t ON t.id = s.tercero_id
  WHERE t.user_id = auth.uid() 
    AND t.access_status = 'approved'
    AND s.status = 'activo'
  LIMIT 1;

  RETURN v_servicio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Trigger Seguridad de Actualizaciones en Terceros (Con soporte seguro para vinculación inicial)
CREATE OR REPLACE FUNCTION public.check_terceros_update_permissions()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_service_level INTEGER;
BEGIN
  -- Permiso de vinculación inicial autorizada:
  -- Si el registro no tenía user_id (OLD.user_id IS NULL) y solo se vincula user_id dejando access_status = 'pending' sin alterar los roles pre-configurados
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL AND NEW.access_status = 'pending' THEN
    IF NEW.is_owner IS NOT DISTINCT FROM OLD.is_owner
       AND NEW.is_service_client IS NOT DISTINCT FROM OLD.is_service_client
       AND NEW.is_driver IS NOT DISTINCT FROM OLD.is_driver THEN
      RETURN NEW;
    END IF;
  END IF;

  IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    v_caller_service_level := public.get_user_service_level();
    IF v_caller_service_level != 1 THEN
      RAISE EXCEPTION 'Acceso denegado: No se puede modificar el user_id de un tercero previamente vinculado.';
    END IF;
  END IF;

  IF OLD.user_id IS NOT NULL AND OLD.user_id = auth.uid() THEN
    IF NEW.access_status IS DISTINCT FROM OLD.access_status THEN
      RAISE EXCEPTION 'Acceso denegado: No tienes permiso para modificar tu propio estado de acceso.';
    END IF;

    IF NEW.is_owner IS DISTINCT FROM OLD.is_owner
       OR NEW.is_service_client IS DISTINCT FROM OLD.is_service_client
       OR NEW.is_driver IS DISTINCT FROM OLD.is_driver
       OR NEW.is_supplier IS DISTINCT FROM OLD.is_supplier THEN
      RAISE EXCEPTION 'Acceso denegado: No tienes permiso para modificar tus propios roles de aplicación.';
    END IF;
  END IF;

  IF (NEW.access_status IS DISTINCT FROM OLD.access_status)
     OR (NEW.is_owner IS DISTINCT FROM OLD.is_owner)
     OR (NEW.is_service_client IS DISTINCT FROM OLD.is_service_client)
     OR (NEW.is_driver IS DISTINCT FROM OLD.is_driver)
     OR (NEW.is_supplier IS DISTINCT FROM OLD.is_supplier) THEN

    v_caller_service_level := public.get_user_service_level();

    IF v_caller_service_level != 1 THEN
      RAISE EXCEPTION 'Acceso denegado: Solo un Administrador Nivel 1 puede aprobar usuarios o modificar roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_terceros_update ON public.terceros;
CREATE TRIGGER trg_check_terceros_update
BEFORE UPDATE ON public.terceros
FOR EACH ROW
EXECUTE FUNCTION public.check_terceros_update_permissions();

-- 9. Permisos Específicos (Sin tocar permisos globales de otras funciones)
REVOKE EXECUTE ON FUNCTION public.setup_user_profile_on_first_login(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_user_by_admin(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_service_level() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_servicio_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.setup_user_profile_on_first_login(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user_by_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_service_level() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_servicio_id() TO authenticated;

-- 10. Políticas RLS para Tabla Terceros (CERO acceso directo a anon)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'terceros') THEN
    ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated view terceros" ON public.terceros;
    DROP POLICY IF EXISTS "Admin/Owners update terceros" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir lectura de terceros para verificacion y consulta" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir lectura de terceros acotada" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir insercion de terceros al registrarse" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir insercion de terceros autenticados" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir actualizacion de terceros" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir actualizacion de terceros autenticados" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir eliminacion de terceros por admins" ON public.terceros;
    DROP POLICY IF EXISTS "Permitir eliminacion de terceros por Nivel 1" ON public.terceros;

    CREATE POLICY "Permitir lectura de terceros acotada"
    ON public.terceros FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR public.get_user_service_level() = 1
      OR (
        public.get_user_service_level() = 2
        AND id IN (
          SELECT driver_id FROM public.vehiculos WHERE servicio_id = public.get_user_servicio_id() AND driver_id IS NOT NULL
          UNION
          SELECT owner_id FROM public.vehiculos WHERE servicio_id = public.get_user_servicio_id() AND owner_id IS NOT NULL
        )
      )
    );

    CREATE POLICY "Permitir insercion de terceros autenticados"
    ON public.terceros FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid() OR public.get_user_service_level() = 1
    );

    CREATE POLICY "Permitir actualizacion de terceros autenticados"
    ON public.terceros FOR UPDATE TO authenticated
    USING (
      user_id = auth.uid() OR public.get_user_service_level() = 1
    )
    WITH CHECK (
      user_id = auth.uid() OR public.get_user_service_level() = 1
    );

    CREATE POLICY "Permitir eliminacion de terceros por Nivel 1"
    ON public.terceros FOR DELETE TO authenticated
    USING (
      public.get_user_service_level() = 1
    );
  END IF;
END $$;
