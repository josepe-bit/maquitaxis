-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - ETAPA 3C FINAL
-- SECURE PROFILE SETUP, REQUESTED_ROLE COLUMN AND AUTO-BINDING PROTECTION
-- ====================================================================

-- 1. Agregar columna requested_role a la tabla terceros con CHECK constraint
ALTER TABLE public.terceros 
ADD COLUMN IF NOT EXISTS requested_role TEXT
CHECK (requested_role IS NULL OR requested_role IN ('NIVEL_1', 'NIVEL_2', 'CONDUCTOR'));

-- 2. Actualizar RPC setup_user_profile_on_first_login con seguridad reforzada
DROP FUNCTION IF EXISTS public.setup_user_profile_on_first_login(TEXT, TEXT, TEXT, TEXT, TEXT);
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
  v_requested_role TEXT;
  v_caller_service_level INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: Usuario no autenticado.';
  END IF;

  -- Determinar y sanitizar el rol solicitado (requested_role)
  v_requested_role := COALESCE(NULLIF(trim(p_role), ''), 'CONDUCTOR');
  IF v_requested_role NOT IN ('NIVEL_1', 'NIVEL_2', 'CONDUCTOR') THEN
    v_requested_role := 'CONDUCTOR';
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

  -- Buscar por número de documento en terceros
  SELECT id, user_id, email, access_status INTO v_existing_tercero_id, v_existing_user_id, v_existing_email, v_existing_status
  FROM public.terceros WHERE doc_number = v_doc_clean LIMIT 1;

  IF v_existing_tercero_id IS NOT NULL THEN
    -- CASO A: Si el tercero existente es administrativo (user_id IS NULL), rechazar auto-vinculación a menos que sea Admin Nivel 1
    IF v_existing_user_id IS NULL THEN
      v_caller_service_level := public.get_user_service_level();
      IF v_caller_service_level != 1 THEN
        RAISE EXCEPTION 'El número de identificación ya se encuentra registrado. Comunícate con el Administrador para activar tu cuenta.';
      END IF;
    END IF;

    -- CASO B: Si ya está vinculado a otro usuario (user_id != v_user_id), rechazar
    IF v_existing_user_id IS NOT NULL AND v_existing_user_id != v_user_id THEN
      RAISE EXCEPTION 'El número de identificación ya se encuentra registrado y vinculado a otra cuenta.';
    END IF;

    IF v_existing_email IS NOT NULL AND LOWER(trim(v_existing_email)) != LOWER(v_user_email) THEN
      RAISE EXCEPTION 'El correo electrónico de tu cuenta no coincide con el registrado para este documento por la administración.';
    END IF;

    IF v_existing_email IS NULL THEN
      RAISE EXCEPTION 'El número de identificación requiere asignación previa de correo por el Administrador antes de activar la cuenta.';
    END IF;

    -- Mantener su estado de acceso
    v_existing_status := COALESCE(v_existing_status, 'pending');

    UPDATE public.terceros
    SET 
      user_id = v_user_id,
      email = v_user_email,
      requested_role = COALESCE(requested_role, v_requested_role),
      access_status = v_existing_status,
      updated_at = NOW()
    WHERE id = v_existing_tercero_id;
    v_tercero_id := v_existing_tercero_id;
  ELSE
    -- CASO F: Inserción inicial de un usuario nuevo
    -- CERO flags efectivos otorgados (is_owner=FALSE, is_service_client=FALSE, is_driver=FALSE).
    -- requested_role guarda el rol solicitado únicamente como información para la administración.
    INSERT INTO public.terceros (
      doc_type, doc_number, name, phone, email, user_id,
      requested_role, is_owner, is_service_client, is_driver, is_supplier, access_status
    ) VALUES (
      COALESCE(NULLIF(p_doc_type, ''), 'CC'), v_doc_clean, trim(p_name),
      NULLIF(trim(p_phone), ''), v_user_email, v_user_id,
      v_requested_role, FALSE, FALSE, FALSE, FALSE, 'pending'
    ) RETURNING id INTO v_tercero_id;
    v_existing_status := 'pending';
  END IF;

  RETURN jsonb_build_object('success', true, 'tercero_id', v_tercero_id, 'access_status', v_existing_status, 'is_new', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Asegurar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.setup_user_profile_on_first_login(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
