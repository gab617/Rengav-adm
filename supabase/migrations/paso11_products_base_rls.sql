-- ============================================================
-- PASO 11: RLS en products_base (catálogo global)
--
-- Objetivo: products_base pasa a ser SOLO de super_admin.
--   - SELECT  -> cualquier usuario autenticado (todos lo leen
--                para poder asignarlo a su tenant).
--   - INSERT  -> solo super_admin.
--   - UPDATE  -> solo super_admin.
--   - DELETE  -> solo super_admin.
--
-- Los admins de tenant ya no pueden escribir en el catálogo
-- global: sus productos nuevos van a user_custom_products.
-- Idempotente: se puede correr varias veces sin romper nada.
-- ============================================================

BEGIN;

ALTER TABLE public.products_base ENABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las policies previas de products_base (cualquier nombre),
-- así no queda ninguna vieja que permita a un admin escribir.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.products_base'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products_base', pol.polname);
  END LOOP;
END $$;

-- SELECT: cualquier usuario autenticado
CREATE POLICY "products_base_select_auth"
  ON public.products_base
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: solo super_admin
CREATE POLICY "products_base_insert_super_admin"
  ON public.products_base
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- UPDATE: solo super_admin
CREATE POLICY "products_base_update_super_admin"
  ON public.products_base
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- DELETE: solo super_admin
CREATE POLICY "products_base_delete_super_admin"
  ON public.products_base
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

COMMIT;

-- Verificación: estado de RLS y policies resultantes
SELECT
  c.relname AS tabla,
  c.relrowsecurity AS rls_habilitado,
  p.polname AS policy,
  p.polcmd AS comando
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname = 'products_base'
ORDER BY p.polname;
