-- ============================================================
-- PASO 32: Rescate de imagen en custom_eliminar
--
-- BUG: si el molde (user_custom_products.image_url) estaba en
-- NULL y la única referencia a la foto vivía en el array
-- imagenes[] de alguna asignación, custom_eliminar borraba esas
-- filas y los paths morían con ellas: producto restaurado sin
-- imagen y archivos huérfanos en el bucket.
--
-- FIX: antes de borrar asignaciones, el molde hereda la imagen
-- principal (posición 1 del primer asignado que tenga).
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

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

  -- 2) RESCATE DE GALERÍA: si el molde no tiene imagen propia,
  --    hereda la principal (pos. 1) del primer asignado que tenga
  --    una. Sin esto, borrar las asignaciones mata las únicas
  --    referencias a esos archivos.
  UPDATE public.user_custom_products c
     SET image_url = COALESCE(
       c.image_url,
       (
         SELECT up.imagenes[1]
         FROM public.user_products up
         WHERE up.custom_id = p_custom_id
           AND cardinality(up.imagenes) > 0
           AND up.imagenes[1] IS NOT NULL
         ORDER BY up.id
         LIMIT 1
       )
     )
   WHERE c.id = p_custom_id;

  -- 3) Borrar asignaciones (el molde ya tiene su imagen rescatada).
  WITH borradas AS (
    DELETE FROM public.user_products
     WHERE custom_id = p_custom_id
     RETURNING 1
  )
  SELECT count(*) INTO v_asignaciones_borradas FROM borradas;

  -- 4) Soft-delete del molde.
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

REVOKE ALL ON FUNCTION public.custom_eliminar(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.custom_eliminar(bigint) TO authenticated;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT 'custom_eliminar' AS seccion,
       (pg_get_functiondef('public.custom_eliminar(bigint)'::regprocedure)
         LIKE '%up.imagenes[1]%') AS tiene_rescate;

COMMIT;
