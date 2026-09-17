-- Migration: 20260922010000_fix_gps_commands_rls_and_rpc.sql
-- Descripción: Corrección de RLS acotado por roles e implementación de RPCs seguras para adquisición atómica de comandos GPS

-- 1. Eliminar políticas anteriores permisivas de gps_commands
DROP POLICY IF EXISTS "Permitir lectura de comandos a usuarios autenticados" ON public.gps_commands;
DROP POLICY IF EXISTS "Permitir insercion de comandos a usuarios autenticados" ON public.gps_commands;
DROP POLICY IF EXISTS "Permitir actualizacion de comandos a usuarios autenticados" ON public.gps_commands;
DROP POLICY IF EXISTS "Permitir lectura acotada de comandos gps" ON public.gps_commands;
DROP POLICY IF EXISTS "Permitir insercion acotada de comandos gps" ON public.gps_commands;

-- 2. Política de LECTURA (SELECT) acotada por rol:
-- - Nivel 1 (Superadmin): Acceso global total
-- - Nivel 2 (Empresa): Acceso acotado a taxis pertenecientes a su servicio_id
-- - Conductores: Acceso a taxis asignados a su tercero (driver_id)
-- - Propietarios: Acceso a taxis vinculados a su tercero (owner_id)
CREATE POLICY "Permitir lectura acotada de comandos gps"
ON public.gps_commands
FOR SELECT
TO authenticated
USING (
  public.get_user_service_level() = 1
  OR (
    public.get_user_service_level() = 2
    AND vehiculo_id IN (
      SELECT id FROM public.vehiculos WHERE servicio_id = public.get_user_servicio_id()
    )
  )
  OR vehiculo_id IN (
    SELECT id FROM public.vehiculos WHERE driver_id IN (
      SELECT id FROM public.terceros WHERE user_id = auth.uid()
    )
  )
  OR vehiculo_id IN (
    SELECT id FROM public.vehiculos WHERE owner_id IN (
      SELECT id FROM public.terceros WHERE user_id = auth.uid()
    )
  )
);

-- 3. Política de INSERCIÓN (INSERT) de comandos desde Web:
-- - Solo Nivel 1 o Nivel 2 (de su propia empresa) pueden crear comandos.
-- - Conductores NO pueden hacer INSERT de comandos.
-- - requested_by debe ser nulo o pertenecer al tercero del usuario autenticado.
CREATE POLICY "Permitir insercion acotada de comandos gps"
ON public.gps_commands
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.get_user_service_level() = 1
    OR (
      public.get_user_service_level() = 2
      AND vehiculo_id IN (
        SELECT id FROM public.vehiculos WHERE servicio_id = public.get_user_servicio_id()
      )
    )
  )
  AND (
    requested_by IS NULL
    OR requested_by IN (SELECT id FROM public.terceros WHERE user_id = auth.uid())
  )
);

-- 4. RPC SECURITY DEFINER para Adquisición Atómica de Comando (pending -> executing)
-- Previene race conditions entre Realtime y el polling de pendientes
CREATE OR REPLACE FUNCTION public.acquire_gps_command_lock(
  p_command_id UUID,
  p_vehiculo_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_updated_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuario no autenticado');
  END IF;

  -- Adquisición ATÓMICA: Transicionar de 'pending' a 'executing' solo si el registro está en 'pending'
  -- Y el usuario autenticado es Nivel 1, Nivel 2 de la empresa o el Conductor asignado (driver_id)
  UPDATE public.gps_commands
  SET status = 'executing',
      updated_at = NOW()
  WHERE id = p_command_id
    AND vehiculo_id = p_vehiculo_id
    AND status = 'pending'
    AND (
      public.get_user_service_level() = 1
      OR (
        public.get_user_service_level() = 2
        AND vehiculo_id IN (
          SELECT id FROM public.vehiculos WHERE servicio_id = public.get_user_servicio_id()
        )
      )
      OR vehiculo_id IN (
        SELECT id FROM public.vehiculos WHERE driver_id IN (
          SELECT id FROM public.terceros WHERE user_id = v_user_id
        )
      )
    )
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    -- El comando ya fue adquirido por otra invocación concurrente, no está pendiente o no está autorizado
    RETURN json_build_object('success', false, 'message', 'Comando no encontrado, no autorizado o ya en ejecucion');
  END IF;

  RETURN json_build_object('success', true, 'command_id', v_updated_id);
END;
$$;

-- 5. RPC SECURITY DEFINER para Finalizar Comando (executing -> completed / failed)
CREATE OR REPLACE FUNCTION public.finalize_gps_command(
  p_command_id UUID,
  p_vehiculo_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_updated_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuario no autenticado');
  END IF;

  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN json_build_object('success', false, 'message', 'Estado final no valido');
  END IF;

  -- Transición válida: solo de 'executing' a 'completed' o 'failed'
  -- Y el usuario autenticado es Nivel 1, Nivel 2 de la empresa o el Conductor asignado (driver_id)
  UPDATE public.gps_commands
  SET status = p_status,
      error_message = CASE WHEN p_status = 'failed' THEN p_error_message ELSE NULL END,
      executed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE executed_at END,
      updated_at = NOW()
  WHERE id = p_command_id
    AND vehiculo_id = p_vehiculo_id
    AND status = 'executing'
    AND (
      public.get_user_service_level() = 1
      OR (
        public.get_user_service_level() = 2
        AND vehiculo_id IN (
          SELECT id FROM public.vehiculos WHERE servicio_id = public.get_user_servicio_id()
        )
      )
      OR vehiculo_id IN (
        SELECT id FROM public.vehiculos WHERE driver_id IN (
          SELECT id FROM public.terceros WHERE user_id = v_user_id
        )
      )
    )
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No se pudo finalizar comando (estado no es executing o no autorizado)');
  END IF;

  RETURN json_build_object('success', true, 'command_id', v_updated_id);
END;
$$;

-- 6. Privilegios de Ejecución (EXECUTE Privileges)
REVOKE EXECUTE ON FUNCTION public.acquire_gps_command_lock(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acquire_gps_command_lock(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.finalize_gps_command(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_gps_command(UUID, UUID, TEXT, TEXT) TO authenticated;
