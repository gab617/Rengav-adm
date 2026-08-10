BEGIN;

-- =========================================================
--  paso13: ON DELETE CASCADE en user_products.custom_id
--
--  Al borrar un custom (user_custom_products) se borran en
--  cascada las user_products que lo referencian, así el
--  borrado del catálogo del negocio desasigna a todos los
--  usuarios de una.
-- =========================================================

ALTER TABLE public.user_products
  DROP CONSTRAINT IF EXISTS user_products_custom_id_fkey;

ALTER TABLE public.user_products
  ADD CONSTRAINT user_products_custom_id_fkey
  FOREIGN KEY (custom_id)
  REFERENCES public.user_custom_products (id)
  ON DELETE CASCADE;

COMMIT;
