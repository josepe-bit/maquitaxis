-- Migration: 20260908000000_alerts_system_schema.sql
-- Description: Schema additions, event_alerts_log table, and secure RPC get_vehicle_event_alerts for Etapa 5C.

-- 1. Column additions for public.eventos
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS advance_warning_kms INT DEFAULT 500,
  ADD COLUMN IF NOT EXISTS advance_warning_days INT DEFAULT 7,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE public.eventos SET advance_warning_kms = 500 WHERE advance_warning_kms IS NULL;
UPDATE public.eventos SET advance_warning_days = 7 WHERE advance_warning_days IS NULL;
UPDATE public.eventos SET is_active = true WHERE is_active IS NULL;

-- 2. Column additions for public.vehiculos (Legal initial dates)
ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS soat_expiration_date DATE NULL,
  ADD COLUMN IF NOT EXISTS tecnomecanica_expiration_date DATE NULL;

-- 3. Table: public.event_alerts_log (Atomic Deduplication & Dispatch Status)
CREATE TABLE IF NOT EXISTS public.event_alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  cycle_anchor TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('proximo', 'vencido')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  recipient_emails TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_alerts_log_unique_cycle UNIQUE (vehiculo_id, evento_id, cycle_anchor, alert_type)
);

-- Indices for event_alerts_log
CREATE INDEX IF NOT EXISTS idx_event_alerts_log_lookup 
  ON public.event_alerts_log(vehiculo_id, evento_id, cycle_anchor);
CREATE INDEX IF NOT EXISTS idx_event_alerts_log_status 
  ON public.event_alerts_log(status);

-- 4. Indices for Performance (Section 32)
CREATE INDEX IF NOT EXISTS idx_produccion_vehiculo_mileage 
  ON public.produccion(vehiculo_id, date DESC, created_at DESC) 
  WHERE mileage > 0;

CREATE INDEX IF NOT EXISTS idx_control_vehiculo_evento 
  ON public.control(vehiculo_id, evento_id, date DESC, created_at DESC);

-- 5. RPC Function: public.get_vehicle_event_alerts()
-- Security: SECURITY DEFINER, search_path = public, ZERO parameters from frontend.
-- Authorization resolved via auth.uid().
CREATE OR REPLACE FUNCTION public.get_vehicle_event_alerts()
RETURNS TABLE (
  vehiculo_id UUID,
  plate TEXT,
  model TEXT,
  evento_id UUID,
  evento_name TEXT,
  applies_by TEXT,
  state TEXT,
  current_mileage INT,
  target_mileage INT,
  remaining_kms INT,
  target_date DATE,
  remaining_days INT,
  reason TEXT,
  cycle_anchor TEXT,
  driver_id UUID,
  driver_name TEXT,
  owner_id UUID,
  owner_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid UUID;
  v_tercero_id UUID;
  v_user_role TEXT;
  v_today DATE := CURRENT_DATE;
  
  -- Iterators
  rec_veh RECORD;
  rec_evt RECORD;
  rec_ctrl RECORD;
  rec_prod RECORD;
  rec_driver RECORD;
  rec_owner RECORD;
  
  -- Calculation variables
  v_curr_km INT;
  v_targ_km INT;
  v_targ_date DATE;
  v_anchor TEXT;
  v_km_warn_threshold INT;
  v_day_warn_threshold INT;
  
  v_km_state TEXT;
  v_date_state TEXT;
  v_final_state TEXT;
  v_reason TEXT;
  
  v_rem_kms INT;
  v_rem_days INT;
  
  v_km_alert_val INT;
  v_date_alert_val DATE;
BEGIN
  -- Determine authenticated user
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado en Supabase';
  END IF;

  -- Lookup tercero associated with auth user
  SELECT id, requested_role INTO v_tercero_id, v_user_role
  FROM public.terceros
  WHERE user_id = v_auth_uid
  LIMIT 1;

  IF v_tercero_id IS NULL THEN
    -- Fallback: if user is logged in but no tercero link, return empty set
    RETURN;
  END IF;

  -- Create temporary table for filtering authorized vehicles
  CREATE TEMP TABLE tmp_auth_vehiculos (
    id UUID PRIMARY KEY,
    plate TEXT,
    model TEXT,
    owner_id UUID,
    driver_id UUID,
    servicio_id UUID,
    soat_expiration_date DATE,
    tecnomecanica_expiration_date DATE,
    operation_card_validity_end DATE
  ) ON COMMIT DROP;

  -- Filter authorized vehicles according to User Role Level (Section 16)
  -- NIVEL 1 (Superadmin / Admin): All vehicles
  IF v_user_role = 'NIVEL_1' OR EXISTS (
    SELECT 1 FROM public.servicios s WHERE s.tercero_id = v_tercero_id AND s.level = 1
  ) THEN
    INSERT INTO tmp_auth_vehiculos
    SELECT v.id, v.plate, v.model, v.owner_id, v.driver_id, v.servicio_id,
           v.soat_expiration_date, v.tecnomecanica_expiration_date, v.operation_card_validity_end
    FROM public.vehiculos v;

  -- NIVEL 2 (Empresa / Client): Vehicles belonging to active services where servicios.tercero_id = user_tercero_id AND status = 'activo'
  ELSIF v_user_role = 'NIVEL_2' OR EXISTS (
    SELECT 1 FROM public.servicios s WHERE s.tercero_id = v_tercero_id AND s.level = 2
  ) THEN
    INSERT INTO tmp_auth_vehiculos
    SELECT v.id, v.plate, v.model, v.owner_id, v.driver_id, v.servicio_id,
           v.soat_expiration_date, v.tecnomecanica_expiration_date, v.operation_card_validity_end
    FROM public.vehiculos v
    JOIN public.servicios s ON v.servicio_id = s.id
    WHERE s.tercero_id = v_tercero_id
      AND s.status = 'activo';

  -- CONDUCTOR: Vehicle assigned to this driver via vehiculos.driver_id
  ELSE
    INSERT INTO tmp_auth_vehiculos
    SELECT v.id, v.plate, v.model, v.owner_id, v.driver_id, v.servicio_id,
           v.soat_expiration_date, v.tecnomecanica_expiration_date, v.operation_card_validity_end
    FROM public.vehiculos v
    WHERE v.driver_id = v_tercero_id;
  END IF;

  -- Iterate through authorized vehicles
  FOR rec_veh IN SELECT * FROM tmp_auth_vehiculos LOOP
    
    -- Fetch driver info if exists
    SELECT t.id, t.name, t.driver_license_expiration INTO rec_driver
    FROM public.terceros t
    WHERE t.id = rec_veh.driver_id;

    -- Fetch owner info if exists
    SELECT t.id, t.name INTO rec_owner
    FROM public.terceros t
    WHERE t.id = rec_veh.owner_id;

    -- Fetch latest current mileage from public.produccion for this vehicle
    SELECT p.mileage INTO v_curr_km
    FROM public.produccion p
    WHERE p.vehiculo_id = rec_veh.id
      AND p.mileage > 0
    ORDER BY p.date DESC, p.created_at DESC
    LIMIT 1;

    -- Iterate through all ACTIVE catalog events
    FOR rec_evt IN 
      SELECT e.id, e.name, e.kms_interval, e.months_interval, e.applies_by,
             COALESCE(e.advance_warning_kms, 500) AS advance_warning_kms,
             COALESCE(e.advance_warning_days, 7) AS advance_warning_days
      FROM public.eventos e
      WHERE COALESCE(e.is_active, true) = true
    LOOP
      v_targ_km := NULL;
      v_targ_date := NULL;
      v_anchor := NULL;
      v_km_warn_threshold := rec_evt.advance_warning_kms;
      v_day_warn_threshold := rec_evt.advance_warning_days;
      
      -- Check if there is a recorded control row for this vehicle + event
      SELECT c.id::text, c.next_change_mileage, c.next_change_date INTO rec_ctrl
      FROM public.control c
      WHERE c.vehiculo_id = rec_veh.id
        AND c.evento_id = rec_evt.id
      ORDER BY c.date DESC, c.created_at DESC
      LIMIT 1;

      IF rec_ctrl.id IS NOT NULL THEN
        -- Control cycle exists
        v_anchor := rec_ctrl.id;
        v_targ_km := rec_ctrl.next_change_mileage;
        v_targ_date := rec_ctrl.next_change_date;
      ELSE
        -- No control cycle exists; check legal document fallbacks (Section 12, 13, 14, 15)
        IF rec_evt.name ILIKE '%SOAT%' THEN
          IF rec_veh.soat_expiration_date IS NOT NULL THEN
            v_anchor := 'soat_init_' || rec_veh.id;
            v_targ_date := rec_veh.soat_expiration_date;
          END IF;
        ELSIF rec_evt.name ILIKE '%Tecno%' THEN
          IF rec_veh.tecnomecanica_expiration_date IS NOT NULL THEN
            v_anchor := 'tecno_init_' || rec_veh.id;
            v_targ_date := rec_veh.tecnomecanica_expiration_date;
          END IF;
        ELSIF rec_evt.name ILIKE '%Tarjeta%Operaci%' THEN
          IF rec_veh.operation_card_validity_end IS NOT NULL THEN
            v_anchor := 'opcard_init_' || rec_veh.id;
            v_targ_date := rec_veh.operation_card_validity_end;
          END IF;
        ELSIF rec_evt.name ILIKE '%Licencia%' THEN
          IF rec_driver.driver_license_expiration IS NOT NULL THEN
            v_anchor := 'driver_lic_' || rec_driver.id;
            v_targ_date := rec_driver.driver_license_expiration;
          END IF;
        END IF;
      END IF;

      -- If no control cycle AND no legal date fallback exists -> SIN_HISTORIAL (Section 9)
      IF v_anchor IS NULL OR (v_targ_km IS NULL AND v_targ_date IS NULL) THEN
        -- Check if event is unconfigured (Section 11)
        IF rec_evt.applies_by = 'ninguno' THEN
          v_final_state := 'SIN_DATOS';
          v_reason := 'Evento informativo no configurado';
        ELSE
          v_final_state := 'SIN_HISTORIAL';
          v_reason := 'SIN HISTORIAL / PENDIENTE REGISTRO INICIAL';
        END IF;
        
        vehiculo_id := rec_veh.id;
        plate := rec_veh.plate;
        model := rec_veh.model;
        evento_id := rec_evt.id;
        evento_name := rec_evt.name;
        applies_by := rec_evt.applies_by;
        state := v_final_state;
        current_mileage := v_curr_km;
        target_mileage := v_targ_km;
        remaining_kms := NULL;
        target_date := v_targ_date;
        remaining_days := NULL;
        reason := v_reason;
        cycle_anchor := COALESCE(v_anchor, 'no_cycle');
        driver_id := rec_driver.id;
        driver_name := rec_driver.name;
        owner_id := rec_owner.id;
        owner_name := rec_owner.name;
        RETURN NEXT;
        CONTINUE;
      END IF;

      -- Calculate Kilometers State (Section 7)
      v_km_state := 'SIN_DATOS';
      v_rem_kms := NULL;
      IF v_targ_km IS NOT NULL THEN
        IF v_curr_km IS NULL OR v_curr_km <= 0 THEN
          v_km_state := 'SIN_DATOS';
        ELSE
          v_rem_kms := v_targ_km - v_curr_km;
          v_km_alert_val := v_targ_km - v_km_warn_threshold;
          
          IF v_curr_km < v_km_alert_val THEN
            v_km_state := 'NORMAL';
          ELSIF v_curr_km < v_targ_km THEN
            v_km_state := 'PROXIMO';
          ELSE
            v_km_state := 'VENCIDO';
          END IF;
        END IF;
      END IF;

      -- Calculate Date State (Section 7)
      v_date_state := 'SIN_DATOS';
      v_rem_days := NULL;
      IF v_targ_date IS NOT NULL THEN
        v_rem_days := (v_targ_date - v_today);
        v_date_alert_val := v_targ_date - (v_day_warn_threshold || ' days')::INTERVAL;
        
        IF v_today < v_date_alert_val THEN
          v_date_state := 'NORMAL';
        ELSIF v_today <= v_targ_date THEN
          v_date_state := 'PROXIMO';
        ELSE
          v_date_state := 'VENCIDO';
        END IF;
      END IF;

      -- Determine Final State based on applies_by (Section 7, 8)
      IF rec_evt.applies_by = 'kilometros' THEN
        v_final_state := v_km_state;
        IF v_km_state = 'NORMAL' THEN v_reason := 'Kilometraje en rango normal';
        ELSIF v_km_state = 'PROXIMO' THEN v_reason := 'Próximo por kilometraje (' || v_rem_kms || ' km restantes)';
        ELSIF v_km_state = 'VENCIDO' THEN v_reason := 'Vencido por kilometraje (' || ABS(v_rem_kms) || ' km excedidos)';
        ELSE v_reason := 'Sin datos de kilometraje actual';
        END IF;

      ELSIF rec_evt.applies_by = 'meses' THEN
        v_final_state := v_date_state;
        IF v_date_state = 'NORMAL' THEN v_reason := 'Fecha en rango normal';
        ELSIF v_date_state = 'PROXIMO' THEN v_reason := 'Próximo por fecha (' || v_rem_days || ' días restantes)';
        ELSIF v_date_state = 'VENCIDO' THEN v_reason := 'Vencido por fecha (' || ABS(v_rem_days) || ' días de retraso)';
        ELSE v_reason := 'Sin fecha objetivo configurada';
        END IF;

      ELSIF rec_evt.applies_by = 'kilometros_y_meses' THEN
        -- Maximum severity rule: NORMAL < PROXIMO < VENCIDO
        IF v_km_state = 'VENCIDO' AND v_date_state = 'VENCIDO' THEN
          v_final_state := 'VENCIDO';
          v_reason := 'Vencido por kilometraje y fecha';
        ELSIF v_km_state = 'VENCIDO' THEN
          v_final_state := 'VENCIDO';
          IF v_date_state = 'SIN_DATOS' THEN
            v_reason := 'Vencido por kilometraje — sin fecha objetivo';
          ELSE
            v_reason := 'Vencido por kilometraje (' || ABS(v_rem_kms) || ' km excedidos)';
          END IF;
        ELSIF v_date_state = 'VENCIDO' THEN
          v_final_state := 'VENCIDO';
          IF v_km_state = 'SIN_DATOS' THEN
            v_reason := 'Vencido por fecha — sin datos de kilometraje';
          ELSE
            v_reason := 'Vencido por fecha (' || ABS(v_rem_days) || ' días de retraso)';
          END IF;
        ELSIF v_km_state = 'PROXIMO' OR v_date_state = 'PROXIMO' THEN
          v_final_state := 'PROXIMO';
          IF v_km_state = 'PROXIMO' AND v_date_state = 'PROXIMO' THEN
            v_reason := 'Próximo por kilometraje y fecha';
          ELSIF v_km_state = 'PROXIMO' THEN
            IF v_date_state = 'SIN_DATOS' THEN
              v_reason := 'Próximo por kilometraje — sin fecha objetivo';
            ELSE
              v_reason := 'Próximo por kilometraje (' || v_rem_kms || ' km restantes)';
            END IF;
          ELSE
            IF v_km_state = 'SIN_DATOS' THEN
              v_reason := 'Próximo por fecha — sin datos de kilometraje';
            ELSE
              v_reason := 'Próximo por fecha (' || v_rem_days || ' días restantes)';
            END IF;
          END IF;
        ELSIF v_km_state = 'NORMAL' AND v_date_state = 'NORMAL' THEN
          v_final_state := 'NORMAL';
          v_reason := 'Kilometraje y fecha en rango normal';
        ELSIF v_km_state = 'NORMAL' THEN
          v_final_state := 'NORMAL';
          v_reason := 'Normal por kilometraje — sin fecha objetivo';
        ELSIF v_date_state = 'NORMAL' THEN
          v_final_state := 'NORMAL';
          v_reason := 'Normal por fecha — sin datos de kilometraje';
        ELSE
          v_final_state := 'SIN_DATOS';
          v_reason := 'Sin datos de kilometraje ni fecha';
        END IF;

      ELSE
        v_final_state := 'SIN_DATOS';
        v_reason := 'Evento no configurado';
      END IF;

      -- Assign return values
      vehiculo_id := rec_veh.id;
      plate := rec_veh.plate;
      model := rec_veh.model;
      evento_id := rec_evt.id;
      evento_name := rec_evt.name;
      applies_by := rec_evt.applies_by;
      state := v_final_state;
      current_mileage := v_curr_km;
      target_mileage := v_targ_km;
      remaining_kms := v_rem_kms;
      target_date := v_targ_date;
      remaining_days := v_rem_days;
      reason := v_reason;
      cycle_anchor := v_anchor;
      driver_id := rec_driver.id;
      driver_name := rec_driver.name;
      owner_id := rec_owner.id;
      owner_name := rec_owner.name;

      RETURN NEXT;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_vehicle_event_alerts() TO authenticated;
