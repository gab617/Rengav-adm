-- ============================================================
-- PASO 14: RLS para user_custom_products — modelo de customs
-- COMPARTIDOS del negocio.
--
-- Síntoma: un rol user (empleado) ve "Producto (sin datos)"
-- en su catálogo. El embed user_custom_products de su
-- user_products asignado devuelve NULL. Causa: las policies
-- viejas limitan el SELECT al propio autor (user_id =
-- auth.uid()); el custom lo creó un admin del MISMO tenant,
-- por lo que el empleado no puede resolverlo.
--
-- Modelo (confirmado con el dueño):
--   SELECT -> cualquier miembro del tenant puede VER los
--             customs de su negocio (+ super_admin todo).
--   INSERT -> el propio autor o un admin.
--   UPDATE -> solo admins del tenant o super_admin.
--   DELETE -> idem UPDATE (la app no borra; lo hace el dueño).
--
-- Nota: los helpers is_admin / is_super_admin / current_tenant_id
-- son SECURITY DEFINER (paso7), por eso no hay recursión de RLS.
-- Idempotente: borra todas las policies previas de la tabla.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
-- ============================================================

BEGIN;

-- ============================================================
-- 1) RLS habilitado (si ya estaba, no cambia nada)
-- ============================================================

ALTER TABLE public.user_custom_products ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2) Borrar TODAS las policies previas de la tabla
-- ============================================================

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_custom_products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_custom_products', pol.policyname);
  END LOOP;
END $$;

-- ============================================================
-- 3) SELECT: super_admin o miembro del tenant del custom
-- ============================================================

CREATE POLICY "customs select tenant"
  ON public.user_custom_products
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_custom_products.user_id
        AND p.tenant_id = public.current_tenant_id()
    )
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
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_custom_products.user_id
          AND p.tenant_id = public.current_tenant_id()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_custom_products.user_id
          AND p.tenant_id = public.current_tenant_id()
      )
    )
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
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_custom_products.user_id
          AND p.tenant_id = public.current_tenant_id()
      )
    )
  );

-- ============================================================
-- 7) VERIFICACION
-- ============================================================

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_custom_products'
ORDER BY policyname;

COMMIT;
