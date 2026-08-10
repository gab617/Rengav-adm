-- ============================================================
-- PASO 15: Corrección de policies de user_custom_products
-- usando función SECURITY DEFINER (patrón del paso7).
--
-- Problema del paso14: la policy SELECT usaba un subquery directo
-- a profiles:
--   EXISTS (SELECT 1 FROM profiles p
--           WHERE p.id = user_custom_products.user_id
--             AND p.tenant_id = current_tenant_id())
--
-- Ese subquery corre con los permisos del usuario logueado y
-- vuelve a pasar por RLS de profiles. La policy de profiles
-- (paso5) solo deja a un rol user leer SU PROPIA fila:
--   auth.uid() = id OR is_super_admin() OR (is_admin() AND tenant)
-- Resultado: el empleado no puede leer el perfil del admin que
-- creó el custom → EXISTS = false → embed user_custom_products
-- NULL → "Producto (sin datos)".
--
-- Solución: función custom_belongs_to_tenant(p_custom_id) que es
-- SECURITY DEFINER (corre como postgres, ignora RLS sin
-- recursión), igual que los helpers del paso7.
--
-- Idempotente. Aplicar desde Supabase SQL Editor (toda la query).
-- ============================================================

BEGIN;

-- ============================================================
-- 1) Función auxiliar SECURITY DEFINER
--    Devuelve true si el custom pertenece al tenant del user
--    logueado (el tenant del perfil que creó el custom).
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_belongs_to_tenant(p_custom_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_custom_products c
    JOIN public.profiles p ON p.id = c.user_id
    WHERE c.id = p_custom_id
      AND p.tenant_id = public.current_tenant_id()
  );
$$;

-- Si quedó una versión previa con otra firma (integer), se elimina
-- para no dejar sobrecargas huérfanas.
DROP FUNCTION IF EXISTS public.custom_belongs_to_tenant(integer);

-- ============================================================
-- 2) Borrar las policies del paso14
-- ============================================================

DROP POLICY IF EXISTS "customs select tenant" ON public.user_custom_products;
DROP POLICY IF EXISTS "customs insert author" ON public.user_custom_products;
DROP POLICY IF EXISTS "customs update admin tenant" ON public.user_custom_products;
DROP POLICY IF EXISTS "customs delete admin tenant" ON public.user_custom_products;

-- ============================================================
-- 3) SELECT: super_admin o miembro del tenant del custom
-- ============================================================

CREATE POLICY "customs select tenant"
  ON public.user_custom_products
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.custom_belongs_to_tenant(id)
  );

-- ============================================================
-- 4) INSERT: el propio autor o cualquier admin
-- ============================================================

CREATE POLICY "customs insert author"
  ON public.user_custom_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================
-- 5) UPDATE: solo admins del tenant o super_admin
-- ============================================================

CREATE POLICY "customs update admin tenant"
  ON public.user_custom_products
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin() AND public.custom_belongs_to_tenant(id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_admin() AND public.custom_belongs_to_tenant(id))
  );

-- ============================================================
-- 6) DELETE: solo admins del tenant o super_admin
-- ============================================================

CREATE POLICY "customs delete admin tenant"
  ON public.user_custom_products
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin() AND public.custom_belongs_to_tenant(id))
  );

-- ============================================================
-- 7) VERIFICACION
-- ============================================================

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_custom_products'
ORDER BY policyname;

COMMIT;
