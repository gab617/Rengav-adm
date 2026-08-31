-- ============================================================
-- PASO 31: Papelera de productos custom (soft-delete + RPCs)
--
-- MODELO:
--   La definición del custom (user_custom_products) NUNCA se
--   borra físicamente: se marca deleted_at y desaparece de todas
--   las listas via RLS. Revivir = deleted_at NULL.
--
--   Las asignaciones (user_products.custom_id) SÍ se borran,
--   pero ANTES hay que soltar las referencias de ventas:
--   user_sales_detail.product_id -> user_products.id es FK
--   restrictiva (el front maneja el 23503 al borrar desde
--   /productos). Por eso custom_eliminar() desarma la cadena
--   en orden: suelta ventas -> borra asignaciones -> marca
--   deleted_at. Todo atómico dentro del RPC.
--
--   Las ventas NO se tocan salvo el puntero: nombre_producto,
--   cantidades y precios son snapshot de texto y quedan intactos.
--
--   Las imágenes del bucket TAMPOCO se purgan: la fila sigue
--   existiendo y las referencia; así el revival conserva fotos.
--
-- Idempotente. Aplicar desde Supabase SQL Editor (toda la query).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Columna deleted_at
-- ------------------------------------------------------------

ALTER TABLE public.user_custom_products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ------------------------------------------------------------
-- 2) Policy SELECT: oculta eliminados PARA TODOS (super_admin
--    incluido). La papelera lista via RPC SECURITY DEFINER.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "customs select tenant" ON public.user_custom_products;

CREATE POLICY "customs select tenant"
  ON public.user_custom_products
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_super_admin()
      OR public.custom_belongs_to_tenant(id)
    )
  );

-- INSERT/UPDATE/DELETE policies del paso15 quedan como están:
-- los flujos nuevos van por RPC, no por DML directo.

-- ------------------------------------------------------------
-- 3) Helper: valida que el caller pueda administrar customs
--    del tenant dado (super_admin cualquiera, admin solo el suyo).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_puede_administrar_tenant(p_tenant_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_tenant_id IS NOT NULL
    AND (
      public.is_super_admin()
      OR (public.is_admin() AND public.current_tenant_id() = p_tenant_id)
    );
$$;

-- ------------------------------------------------------------
-- 4) custom_eliminar(p_custom_id)
--    Desarma la cadena venta->asignación->molde y soft-borra.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_eliminar(p_custom_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id bigint;
  v_deleted_at timestamptz;
  v_ventas_afectadas int := 0;
  v_asignaciones_borradas int := 0;
BEGIN
  -- El custom tiene que existir...
  SELECT c.deleted_at, p.tenant_id
    INTO v_deleted_at, v_tenant_id
  FROM public.user_custom_products c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE c.id = p_custom_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'custom_inexistente');
  END IF;

  -- ...y el caller tiene que poder administrar ese tenant.
  IF NOT public.custom_puede_administrar_tenant(v_tenant_id) THEN
    RETURN jsonb_build_object('error', 'no_autorizado');
  END IF;

  -- Idempotente: ya estaba en papelera, no re-intentamos nada.
  IF v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'ya_eliminado', true);
  END IF;

  -- 1) Soltar referencias de ventas (FK restrictiva):
  --    la venta conserva su snapshot, pierde el puntero.
  WITH afectadas AS (
    UPDATE public.user_sales_detail sd
       SET product_id = NULL
     WHERE sd.product_id IN (
       SELECT up.id FROM public.user_products up
       WHERE up.custom_id = p_custom_id
     )
     RETURNING 1
  )
  SELECT count(*) INTO v_ventas_afectadas FROM afectadas;

  -- 2) Borrar asignaciones (ya nadie las referencia).
  WITH borradas AS (
    DELETE FROM public.user_products
     WHERE custom_id = p_custom_id
     RETURNING 1
  )
  SELECT count(*) INTO v_asignaciones_borradas FROM borradas;

  -- 3) Soft-delete del molde.
  UPDATE public.user_custom_products
     SET deleted_at = now()
   WHERE id = p_custom_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ventas_afectadas', v_ventas_afectadas,
    'asignaciones_borradas', v_asignaciones_borradas
  );
END;
$$;

-- ------------------------------------------------------------
-- 5) custom_restaurar(p_custom_id)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_restaurar(p_custom_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id bigint;
BEGIN
  SELECT p.tenant_id INTO v_tenant_id
  FROM public.user_custom_products c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE c.id = p_custom_id AND c.deleted_at IS NOT NULL;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'custom_inexistente_o_no_eliminado');
  END IF;

  IF NOT public.custom_puede_administrar_tenant(v_tenant_id) THEN
    RETURN jsonb_build_object('error', 'no_autorizado');
  END IF;

  UPDATE public.user_custom_products
     SET deleted_at = NULL
   WHERE id = p_custom_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ------------------------------------------------------------
-- 6) custom_papelera(p_tenant_id)
--    Lista eliminados del tenant. super_admin puede pasar
--    cualquier tenant; un admin solo el propio.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_papelera(p_tenant_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.custom_puede_administrar_tenant(p_tenant_id) THEN
    RETURN jsonb_build_object('error', 'no_autorizado');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',            c.id,
        'name',          c.name,
        'image_url',     c.image_url,
        'brand_text',    c.brand_text,
        'brand_name',    b.name,
        'creado_por',    p.name,
        'deleted_at',    c.deleted_at
      ) ORDER BY c.deleted_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.user_custom_products c
  JOIN public.profiles p  ON p.id = c.user_id
  LEFT JOIN public.brands b ON b.id = c.brand_id
  WHERE c.deleted_at IS NOT NULL
    AND p.tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'items', v_result);
END;
$$;

-- ------------------------------------------------------------
-- 7) Grants: solo authenticated, nada para anon/PUBLIC
-- ------------------------------------------------------------

REVOKE ALL ON FUNCTION public.custom_puede_administrar_tenant(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.custom_eliminar(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.custom_restaurar(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.custom_papelera(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.custom_puede_administrar_tenant(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_eliminar(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_restaurar(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_papelera(bigint) TO authenticated;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT 'columna' AS seccion,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name = 'user_custom_products'
                 AND column_name = 'deleted_at') AS tiene_deleted_at;

SELECT 'policy' AS seccion, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_custom_products'
ORDER BY policyname;

SELECT 'funciones' AS seccion,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_eliminar')   AS fn_eliminar,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_restaurar')  AS fn_restaurar,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_papelera')   AS fn_papelera;

COMMIT;
