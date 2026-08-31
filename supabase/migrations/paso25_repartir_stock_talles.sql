-- ============================================================
-- PASO 25: REPARTIR STOCK GENERAL ENTRE TALLES
--
-- Problema: productos con talles asignados (products_base.talles
-- o user_custom_products.talles) pero con user_products.stock_talles
-- null o vacío y stock general > 0 quedaban como "pool compartido":
-- cada talle leía el stock general, generando descuentos
-- inconsistentes en el POS (/productos).
--
-- Regla de negocio (paso 25): producto con talles -> stock SIEMPRE
-- por talle. Esta migración reparte el stock general ya existente
-- entre los talles (partes iguales, resto al primero) para no
-- perder stock. Los productos sin stock o con desglose definido
-- no se tocan.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  r record;
  n int;
  por_talle numeric;
  resto numeric;
  nuevo jsonb;
  i int;
  size_rec record;
BEGIN
  FOR r IN
    SELECT
      up.id,
      up.stock,
      COALESCE(pb.talles, uc.talles) AS talles_ids
    FROM user_products up
    LEFT JOIN products_base pb ON pb.id = up.base_id
    LEFT JOIN user_custom_products uc ON uc.id = up.custom_id
    WHERE COALESCE(pb.talles, uc.talles) IS NOT NULL
      AND array_length(COALESCE(pb.talles, uc.talles), 1) > 0
      AND (up.stock_talles IS NULL OR up.stock_talles = '{}')
      AND COALESCE(up.stock, 0) > 0
  LOOP
    n := array_length(r.talles_ids, 1);
    por_talle := floor(r.stock / n);
    resto := r.stock - por_talle * n;
    nuevo := '{}';
    i := 0;

    FOR size_rec IN
      SELECT s.id, s.name
      FROM sizes s
      WHERE s.id = ANY(r.talles_ids)
      ORDER BY s.sort_order, s.id
    LOOP
      nuevo := nuevo || jsonb_build_object(
        size_rec.name,
        CASE WHEN i = 0 THEN por_talle + resto ELSE por_talle END
      );
      i := i + 1;
    END LOOP;

    UPDATE user_products
    SET stock_talles = nuevo
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================================
-- VERIFICACION: productos con talles que quedaron sin desglose
-- ============================================================

SELECT
  up.id,
  up.user_id,
  up.stock,
  COALESCE(pb.talles, uc.talles) AS talles_ids,
  up.stock_talles
FROM user_products up
LEFT JOIN products_base pb ON pb.id = up.base_id
LEFT JOIN user_custom_products uc ON uc.id = up.custom_id
WHERE COALESCE(pb.talles, uc.talles) IS NOT NULL
  AND array_length(COALESCE(pb.talles, uc.talles), 1) > 0
  AND (up.stock_talles IS NULL OR up.stock_talles = '{}');
