-- ============================================================
-- PASO 17: Productos DESTACADOS (por sucursal)
--
-- Objetivo: permitir que cada sucursal marque productos como
-- "destacados" en su catálogo.
--
-- DECISIÓN DE MODELO (confirmada con el dueño):
--   El flag vive en user_products (POR SUCURSAL), igual que el
--   resto del catálogo. Cada tienda decide sus propios
--   destacados; no hay cascada sucursal->tenant porque el
--   catálogo ya es por sucursal.
--
-- ESTE PASO AGREGA 2 COSAS:
--   1) user_products.destacado  -> boolean, default false,
--      con índice parcial para listar destacados rápido.
--   2) Contrato del storefront  -> storefront_get_catalogo
--      devuelve 'destacado' en cada producto y ordena los
--      destacados primero.
--
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Columna destacado en user_products
-- ------------------------------------------------------------
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS destacado boolean NOT NULL DEFAULT false;

-- Índice parcial: solo filas destacadas, por sucursal
CREATE INDEX IF NOT EXISTS user_products_destacado_idx
  ON public.user_products (user_id) WHERE destacado;

-- ------------------------------------------------------------
-- 2) Contrato del storefront: storefront_get_catalogo
--    Devuelve 'destacado' y ordena destacados primero.
-- ------------------------------------------------------------
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

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_products'
  AND column_name = 'destacado';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_products'
  AND indexname = 'user_products_destacado_idx';

SELECT p.proname, p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'storefront_get_catalogo';

COMMIT;
