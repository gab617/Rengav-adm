-- ============================================================
-- PASO 2: Endurecer RLS de tenants y profiles
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query)
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Depende de Paso 1 (is_admin / is_super_admin / current_tenant_id).
-- ============================================================

BEGIN;

-- ============================================================
-- 1) TENANTS: activar RLS y cerrar acceso directo
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- anon no toca tenants (ni TRUNCATE ni nada)
REVOKE ALL ON public.tenants FROM anon;

-- authenticated: solo SELECT (leer nombre del propio negocio)
REVOKE ALL ON public.tenants FROM authenticated;
GRANT SELECT ON public.tenants TO authenticated;

-- super_admin: acceso total
DROP POLICY IF EXISTS "super admin full access tenants" ON public.tenants;
CREATE POLICY "super admin full access tenants"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- admin: puede leer SU tenant (y super_admin suyo propio)
DROP POLICY IF EXISTS "admins can read own tenant" ON public.tenants;
CREATE POLICY "admins can read own tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR current_tenant_id() = id);

-- ============================================================
-- 2) PROFILES: cerrar INSERT/UPDATE abiertos
-- ============================================================

-- Los perfiles los crea el trigger handle_new_user() (SECURITY DEFINER).
-- Nadie deberia insertar/borrar perfiles directo.
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.profiles FROM anon;

-- El rol/tenant de un perfil solo se cambia por RPC (admin_create_user).
-- Revocar columnas sensibles impide escalar aunque exista policy.
REVOKE UPDATE (role, tenant_id, parent_admin_id) ON public.profiles FROM authenticated;

-- Bajar las policies que permitian INSERT (cualquiera) y UPDATE (cualquiera)
DROP POLICY IF EXISTS "Allow authenticated insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin update profiles" ON public.profiles;

-- Self-service: cada usuario actualiza solo su fila (sin role/tenant_id,
-- que quedaron revocados a nivel columna)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- 3) RPC: admin_create_tenant (solo super_admin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_create_tenant(p_name text)
RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo el super admin puede crear tenants';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'El nombre del negocio es obligatorio';
  END IF;

  INSERT INTO public.tenants (name)
  VALUES (trim(p_name))
  RETURNING * INTO v_tenant;

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_tenant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_tenant(text) TO authenticated;

-- ============================================================
-- 4) RPC: admin_create_user (admin de su tenant / super_admin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_user_id uuid,
  p_name text,
  p_role text,
  p_tenant_id bigint,
  p_parent_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_tenant bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT role, tenant_id INTO v_caller_role, v_caller_tenant
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de origen no encontrado';
  END IF;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'No tenes permisos para crear usuarios';
  END IF;

  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Rol invalido: solo user o admin';
  END IF;

  -- admin solo puede trabajar en SU tenant
  IF v_caller_role = 'admin' AND p_tenant_id IS DISTINCT FROM v_caller_tenant THEN
    RAISE EXCEPTION 'No podes crear usuarios en otro negocio';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  UPDATE public.profiles
  SET name = trim(p_name),
      role = p_role,
      tenant_id = p_tenant_id,
      parent_admin_id = p_parent_admin_id
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario no existe o su perfil no fue creado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(uuid, text, text, bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user(uuid, text, text, bigint, uuid) TO authenticated;

COMMIT;
