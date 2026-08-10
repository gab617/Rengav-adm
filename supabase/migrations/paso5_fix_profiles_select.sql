-- ============================================================
-- PASO 5: Restaurar lectura de profiles para authenticated
-- Sintoma: 42501 "permission denied for table profiles" al
-- loguearse con un usuario normal o listar usuarios como admin.
-- Causa probable: un REVOKE previo dejo a authenticated sin
-- SELECT sobre profiles (y sin policy de lectura).
-- Idempotente.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) GRANTS (idempotentes: si ya existen no rompen nada)
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;

-- authenticated lee profiles. INSERT/DELETE siguen revocados
-- (los perfiles los crea el trigger), UPDATE solo fila propia.
GRANT SELECT ON public.profiles TO authenticated;

-- user_preferences es 100% personal: el login hace el INSERT lazy
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
REVOKE ALL ON public.user_preferences FROM anon;

-- ============================================================
-- 2) POLICY de lectura de profiles
--    - cada usuario ve SU fila (necesario para el login)
--    - admin ve los usuarios de SU tenant
--    - super_admin ve todo
-- ============================================================

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read users of their tenant" ON public.profiles;
DROP POLICY IF EXISTS "super admin read all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (public.is_admin() AND public.current_tenant_id() = tenant_id)
  );

COMMIT;

-- ============================================================
-- DIAGNOSTICO: correr esto en el SQL Editor despues del COMMIT
-- y pegar el resultado si algo sigue fallando.
-- ============================================================

-- Grants actuales de profiles (debe aparecer SELECT para authenticated)
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name IN ('profiles', 'user_preferences')
--   AND grantee IN ('anon', 'authenticated', 'service_role')
-- ORDER BY table_name, grantee, privilege_type;

-- Policies de profiles
-- SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
-- FROM pg_policy
-- WHERE polrelid = 'public.profiles'::regclass;

-- Ultimas filas de profiles (postgres ignora RLS, muestra la verdad)
-- SELECT id, role, name, tenant_id, parent_admin_id, created_at
-- FROM public.profiles
-- ORDER BY created_at DESC
-- LIMIT 10;
