BEGIN;

-- =========================================================
--  paso12: asignación de productos custom entre usuarios del mismo tenant
--
--  Un custom (user_custom_products) puede asignarse a varios users del
--  tenant vía user_products.custom_id. Para evitar dobles asignaciones,
--  agregamos una constraint UNIQUE (user_id, custom_id).
-- =========================================================

-- 1) Limpiar duplicados previos: conservar el registro con el menor id
DELETE FROM public.user_products a
USING public.user_products b
WHERE a.user_id = b.user_id
  AND a.custom_id = b.custom_id
  AND a.custom_id IS NOT NULL
  AND a.id > b.id;

-- 2) Constraint UNIQUE (user_id, custom_id) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_products'::regclass
      AND conname = 'user_products_user_id_custom_id_key'
  ) THEN
    ALTER TABLE public.user_products
      ADD CONSTRAINT user_products_user_id_custom_id_key
      UNIQUE (user_id, custom_id);
  END IF;
END $$;

-- 3) Índice auxiliar para el filtro "customs asignados a un user"
CREATE INDEX IF NOT EXISTS user_products_custom_id_idx
  ON public.user_products (custom_id)
  WHERE custom_id IS NOT NULL;

COMMIT;
