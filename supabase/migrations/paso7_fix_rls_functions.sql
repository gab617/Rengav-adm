-- ============================================================
-- PASO 7: RLS helpers como SECURITY DEFINER
-- is_admin / is_super_admin / current_tenant_id consultan
-- profiles internamente. Si NO son security definer, la query
-- interna corre con los permisos del usuario y vuelve a pasar
-- por RLS -> recursion de policies -> "Database error querying
-- schema" + 42501. Con SECURITY DEFINER corren como postgres.
-- Idempotente.
-- ============================================================

-- 0) (informativo) ver las definiciones actuales antes de reemplazar
SELECT pg_get_functiondef(p.oid) AS definicion_actual
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_super_admin', 'current_tenant_id')
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

BEGIN;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

COMMIT;
