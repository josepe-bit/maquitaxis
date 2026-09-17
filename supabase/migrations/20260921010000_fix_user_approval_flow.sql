-- Migration: 20260921010000_fix_user_approval_flow.sql
-- Description: Fix user approval flow to ensure that registering or confirming email never auto-approves access.
-- All user account linkages require access_status = 'pending' until explicit Level 1 approval via approve_user_by_admin.

CREATE OR REPLACE FUNCTION public.setup_user_profile_on_first_login(
  p_doc_type text,
  p_doc_number text,
  p_name text,
  p_phone text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: Usuario no autenticado.';
  END IF;

  -- Sanitizar el rol solicitado (requested_role)
  v_requested_role := COALESCE(NULLIF(trim(p_role), ''), 'CONDUCTOR');
  IF v_requested_role NOT IN ('NIVEL_1', 'NIVEL_2', 'CONDUCTOR') THEN
    v_requested_role := 'CONDUCTOR';
  END IF;

  SELECT email, email_confirmed_at INTO v_user_email, v_confirmed_at FROM auth.users WHERE id = v_user_id;

  IF v_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: Debes confirmar tu correo electrónico antes de activar tu perfil.';
  END IF;

  -- 1. Idempotencia: Si ya está vinculado a este auth.uid(), retornar su estado actual sin alterar nada
  SELECT id, access_status INTO v_tercero_id, v_existing_status FROM public.terceros WHERE user_id = v_user_id LIMIT 1;
  IF v_tercero_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'tercero_id', v_tercero_id, 'access_status', v_existing_status, 'is_new', false);
  END IF;

  -- 2. Buscar por número de documento en terceros donde user_id IS NULL (pre-creado administrativamente) o coincida
  SELECT id, user_id, email, access_status INTO v_existing_tercero_id, v_existing_user_id, v_existing_email, v_existing_status
  FROM public.terceros WHERE doc_number = v_doc_clean LIMIT 1;

  IF v_existing_tercero_id IS NOT NULL THEN
    -- Si ya está vinculado a otro usuario distinto (user_id IS NOT NULL AND user_id != v_user_id), rechazar
    IF v_existing_user_id IS NOT NULL AND v_existing_user_id != v_user_id THEN
      RAISE EXCEPTION 'El número de identificación ya se encuentra registrado y vinculado a otra cuenta.';
    END IF;

    IF v_existing_email IS NOT NULL AND LOWER(trim(v_existing_email)) != LOWER(trim(v_user_email)) THEN
      RAISE EXCEPTION 'El correo electrónico de tu cuenta no coincide con el registrado para este documento por la administración.';
    END IF;

    -- REGLA DEFINITIVA: Cuando un usuario vincula por primera vez su cuenta de autenticación (user_id IS NULL -> v_user_id),
    -- el estado de acceso de la cuenta DEBE SER 'pending' hasta que Nivel 1 ejecute la aprobación explícita.
    UPDATE public.terceros
    SET 
      user_id = v_user_id,
      email = v_user_email,
      requested_role = COALESCE(requested_role, v_requested_role),
      access_status = 'pending',
      updated_at = NOW()
    WHERE id = v_existing_tercero_id;

    v_tercero_id := v_existing_tercero_id;
    v_existing_status := 'pending';
  ELSE
    -- Inserción inicial de un usuario nuevo cuya identificación no existía en terceros
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

  RETURN jsonb_build_object('success', true, 'tercero_id', v_tercero_id, 'access_status', 'pending', 'is_new', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_user_profile_on_first_login(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
