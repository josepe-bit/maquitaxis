-- ====================================================================
-- MAQUITAXIS DATABASE MIGRATION - FASE 2N
-- FORMALIZACIÓN Y MIGRACIÓN REPRODUCIBLE POST-FIX RECURSIÓN RLS
-- ====================================================================

-- 1. Helper Function: private.get_user_service_level()
CREATE OR REPLACE FUNCTION private.get_user_service_level()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'private', 'pg_temp'
SET row_security TO 'off'
AS $$
    SELECT COALESCE(
        (
            SELECT s.level
            FROM public.terceros AS t
            JOIN public.servicios AS s
                ON s.tercero_id = t.id
            WHERE t.user_id = auth.uid()
              AND t.access_status = 'approved'
              AND s.status = 'activo'
              AND s.level IN (1, 2)
            ORDER BY s.level
            LIMIT 1
        ),
        3
    );
$$;

-- 2. Helper Function: public.get_user_service_level()
CREATE OR REPLACE FUNCTION public.get_user_service_level()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'private', 'pg_temp'
SET row_security TO 'off'
AS $$
    SELECT private.get_user_service_level();
$$;

-- 3. Helper Function: private.get_user_servicio_id()
CREATE OR REPLACE FUNCTION private.get_user_servicio_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'private', 'pg_temp'
SET row_security TO 'off'
AS $$
    SELECT s.id
    FROM public.terceros AS t
    JOIN public.servicios AS s
        ON s.tercero_id = t.id
    WHERE t.user_id = auth.uid()
      AND t.access_status = 'approved'
      AND s.status = 'activo'
      AND s.level IN (1, 2)
    ORDER BY s.level
    LIMIT 1;
$$;

-- 4. Helper Function: public.get_user_servicio_id()
CREATE OR REPLACE FUNCTION public.get_user_servicio_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'private', 'pg_temp'
SET row_security TO 'off'
AS $$
    SELECT private.get_user_servicio_id();
$$;

-- 5. Helper Function: private.get_user_tercero_id()
CREATE OR REPLACE FUNCTION private.get_user_tercero_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'private', 'pg_temp'
SET row_security TO 'off'
AS $$
    SELECT t.id
    FROM public.terceros t
    WHERE t.user_id = auth.uid()
    LIMIT 1;
$$;

-- 6. Helper Function: public.get_user_tercero_id()
CREATE OR REPLACE FUNCTION public.get_user_tercero_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'private', 'pg_temp'
SET row_security TO 'off'
AS $$
    SELECT private.get_user_tercero_id();
$$;

-- 7. Actualización de Políticas RLS en public.vehiculos para desacoplar bucle cruzado
DROP POLICY IF EXISTS "Permitir lectura de vehiculos acotada por servicio" ON public.vehiculos;

CREATE POLICY "Permitir lectura de vehiculos acotada por servicio"
ON public.vehiculos FOR SELECT TO authenticated
USING (
  (get_user_service_level() = 1) 
  OR ((get_user_service_level() = 2) AND (servicio_id = get_user_servicio_id())) 
  OR (driver_id = get_user_tercero_id()) 
  OR (owner_id = get_user_tercero_id())
);

DROP POLICY IF EXISTS "Permitir actualizacion de vehiculos por servicio" ON public.vehiculos;

CREATE POLICY "Permitir actualizacion de vehiculos por servicio"
ON public.vehiculos FOR UPDATE TO authenticated
USING (
  (get_user_service_level() = 1) 
  OR ((get_user_service_level() = 2) AND (servicio_id = get_user_servicio_id())) 
  OR (driver_id = get_user_tercero_id()) 
  OR (owner_id = get_user_tercero_id())
);
