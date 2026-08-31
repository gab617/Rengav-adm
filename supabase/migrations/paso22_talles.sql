-- ============================================================
-- PASO 22: TALLES (producto con atributo de talle, NO un
--           producto por talle)
--
-- Modelo confirmado con el dueño:
--   * Un producto puede tener varios talles disponibles. El talle
--     es un ATRIBUTO del producto, no un producto separado.
--   * `sizes`          -> catálogo GLOBAL de talles (S, M, L, 36...)
--   * `category_sizes` -> qué talles aplican a cada categoría
--                         (ropa: S..XXL; calzado: 35..46).
--   * products_base / user_custom_products .talles int[]
--     -> subconjunto de talles que ese producto tiene.
--      '{}' = producto SIN talles (no se filtra por talle).
--   * user_products.stock_talles jsonb
--     -> STOCK POR TALLE POR VENDEDOR, clave = nombre del talle.
--      null = sin desglose (usa el stock general).
--
-- Storefront: cada producto expone `talles: [{id, nombre,
-- disponible}]`. NO expone stock exacto (misma filosofía que
-- `disponibilidad`). `disponible` = stock del talle > 0.
--
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Tabla sizes (catálogo global de talles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sizes (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  sort_order int  NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 2) category_sizes (talles disponibles por categoría)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.category_sizes (
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  size_id     bigint NOT NULL REFERENCES public.sizes(id)     ON DELETE CASCADE,
  position    int    NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, size_id)
);

-- ------------------------------------------------------------
-- 3) RLS: igual que products_base (catálogo global)
--    SELECT -> authenticated | escritura -> solo super_admin
-- ------------------------------------------------------------
ALTER TABLE public.sizes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY sizes_select_auth
  ON public.sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY sizes_insert_super_admin
  ON public.sizes FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY sizes_update_super_admin
  ON public.sizes FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY sizes_delete_super_admin
  ON public.sizes FOR DELETE TO authenticated
  USING (public.is_super_admin());

CREATE POLICY category_sizes_select_auth
  ON public.category_sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY category_sizes_insert_super_admin
  ON public.category_sizes FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY category_sizes_update_super_admin
  ON public.category_sizes FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY category_sizes_delete_super_admin
  ON public.category_sizes FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ------------------------------------------------------------
-- 4) Columnas de talles en las DEFINICIONES de producto
--    '{}' = sin talles. ADD COLUMN con default constante es
--    metadata-only: no reescribe filas existentes.
-- ------------------------------------------------------------
ALTER TABLE public.products_base
  ADD COLUMN IF NOT EXISTS talles int[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_custom_products
  ADD COLUMN IF NOT EXISTS talles int[] NOT NULL DEFAULT '{}';

-- ------------------------------------------------------------
-- 5) Stock por talle por VENDEDOR (capa user_products)
--    null = sin desglose por talle (usa stock general).
-- ------------------------------------------------------------
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS stock_talles jsonb;

-- ------------------------------------------------------------
-- 6) Seed del catálogo de talles (idempotente)
-- ------------------------------------------------------------
INSERT INTO public.sizes (name, sort_order) VALUES
  ('Talle único', 10),
  ('S', 20),
  ('M', 30),
  ('L', 40),
  ('XL', 50),
  ('XXL', 60),
  ('XXXL', 70),
  ('35', 80),
  ('36', 90),
  ('37', 100),
  ('38', 110),
  ('39', 120),
  ('40', 130),
  ('41', 140),
  ('42', 150),
  ('43', 160),
  ('44', 170),
  ('45', 180),
  ('46', 190)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 7) Contrato del storefront: storefront_get_catalogo
--    Cada producto ahora expone 'talles'.
--    disponible por talle: si stock_talles es null, todos los
--    talles usan el stock general; si está definido, cada talle
--    usa su propio stock (falta = 0).
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
                      THEN (up.stock_talles->>s.name)::numeric::int
                    END,
                    CASE WHEN up.stock_talles IS NULL THEN up.stock ELSE 0 END
                  ),
                'disponible',
                  COALESCE(
                    CASE
                      WHEN up.stock_talles->>s.name ~ '^[0-9]+(\.?[0-9]+)?$'
                      THEN (up.stock_talles->>s.name)::numeric::int
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
-- 8) VERIFICACION
-- ============================================================

SELECT 'sizes' AS seccion, count(*) AS filas FROM public.sizes;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('products_base', 'user_custom_products', 'user_products')
  AND column_name IN ('talles', 'stock_talles')
ORDER BY table_name, column_name;

SELECT c.relname AS tabla, p.polname AS policy, p.polcmd AS comando
FROM pg_class c
JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname IN ('sizes', 'category_sizes')
ORDER BY c.relname, p.polname;

SELECT p.proname, p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'storefront_get_catalogo';

COMMIT;
