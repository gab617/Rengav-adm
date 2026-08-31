-- ============================================================
-- PASO 26: FIX storefront_get_catalogo — stock_talles con puntos
--
-- Problema: stock_talles tiene valores como "30.000" (formato
-- argentino con punto de miles) que fallan al castearse a int.
-- La función storefront_get_catalogo (paso22) usaba
--   (stock_talles->>name)::numeric::int
-- que no tolera "30.000".
--
-- Solución:
--   1) Sanitizar datos existentes: reemplazar "." en valores
--      numéricos de stock_talles (son punto de miles, NO decimal).
--   2) Reemplazar la función con una versión que use
--      regexp_replace para limpiar antes de castear.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) SANITIZAR DATOS EXISTENTES
--    Quita puntos de los valores numéricos en stock_talles.
--    Ej: {"S":"30.000","M":"45.000"} → {"S":"30000","M":"45000"}
-- ============================================================

UPDATE public.user_products
SET stock_talles = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value ~ '^\d+\.\d+$' THEN regexp_replace(value, '\.', '', 'g')
      ELSE value
    END
  )
  FROM jsonb_each_text(stock_talles)
)
WHERE stock_talles IS NOT NULL
  AND stock_talles != '{}'::jsonb
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(stock_talles)
    WHERE value ~ '^\d+\.\d+$'
  );

-- ============================================================
-- 2) REEMPLAZAR FUNCIÓN storefront_get_catalogo
--    Versión robusta que limpia puntos antes de castear.
-- ============================================================

CREATE OR REPLACE FUNCTION public.storefront_get_catalogo(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_result  jsonb;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RETURN jsonb_build_array();
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE slug = lower(trim(p_slug))
    AND tenant_id IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_array();
  END IF;

  SELECT COALESCE(jsonb_agg(prod ORDER BY (prod->>'destacado')::boolean DESC, prod->>'nombre'), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id',        up.id,
      'tipo',      CASE WHEN up.custom_id IS NOT NULL THEN 'custom' ELSE 'base' END,
      'destacado', COALESCE(up.destacado, false),
      'nombre',    COALESCE(pb.name, ucp.name),
      'descripcion', up.descripcion,
      'precio_venta', up.precio_venta,
      'disponibilidad',
        CASE
          WHEN up.stock IS NULL OR up.stock <= 0 THEN 'agotado'
          WHEN up.stock <= 5 THEN 'ultimas_unidades'
          ELSE 'en_stock'
        END,
      'talles',
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id',        s.id,
                'nombre',    s.name,
                'stock',
                  COALESCE(
                    CASE
                      WHEN up.stock_talles->>s.name ~ '^[0-9]+(\.?[0-9]+)?$'
                      THEN regexp_replace(up.stock_talles->>s.name, '\.', '', 'g')::int
                    END,
                    CASE WHEN up.stock_talles IS NULL THEN up.stock ELSE 0 END
                  ),
                'disponible',
                  COALESCE(
                    CASE
                      WHEN up.stock_talles->>s.name ~ '^[0-9]+(\.?[0-9]+)?$'
                      THEN regexp_replace(up.stock_talles->>s.name, '\.', '', 'g')::int
                    END,
                    CASE WHEN up.stock_talles IS NULL THEN up.stock ELSE 0 END
                  ) > 0
              )
              ORDER BY s.sort_order, s.id
            )
            FROM unnest(COALESCE(pb.talles, ucp.talles, '{}'::int[])) AS tid
            JOIN public.sizes s ON s.id = tid
          ),
          '[]'::jsonb
        ),
      'imagenes',
        CASE
          WHEN COALESCE(array_length(up.imagenes, 1), 0) > 0 THEN to_jsonb(up.imagenes)
          WHEN pb.image_url IS NOT NULL THEN to_jsonb(ARRAY[pb.image_url])
          WHEN ucp.image_url IS NOT NULL THEN to_jsonb(ARRAY[ucp.image_url])
          ELSE '[]'::jsonb
        END,
      'categoria',    jsonb_build_object('id', c.id, 'nombre', c.name),
      'subcategoria', jsonb_build_object('id', sc.id, 'nombre', sc.name),
      'marca',        COALESCE(ucp.brand_text, b.name),
      'tipo_unit',    pb.type_unit
    ) AS prod
    FROM public.user_products up
    LEFT JOIN public.products_base pb        ON pb.id = up.base_id
    LEFT JOIN public.user_custom_products ucp ON ucp.id = up.custom_id
    LEFT JOIN public.brands b        ON b.id = COALESCE(pb.brand_id, ucp.brand_id)
    LEFT JOIN public.categories c    ON c.id = COALESCE(pb.category_id, ucp.category_id)
    LEFT JOIN public.subcategories sc ON sc.id = COALESCE(pb.subcategory_id, ucp.subcategory_id)
    WHERE up.user_id = v_profile.id
      AND up.active IS NOT FALSE
  ) sub;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.storefront_get_catalogo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_get_catalogo(text) TO anon, authenticated;

-- ============================================================
-- 3) VERIFICACION
-- ============================================================

SELECT COUNT(*) AS productos_con_stock_talles
FROM public.user_products
WHERE stock_talles IS NOT NULL AND stock_talles != '{}'::jsonb;

SELECT id, stock_talles
FROM public.user_products
WHERE stock_talles IS NOT NULL AND stock_talles != '{}'::jsonb
LIMIT 5;

COMMIT;
