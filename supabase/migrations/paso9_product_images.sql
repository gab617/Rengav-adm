-- ============================================================
-- PASO 9: Imágenes de productos por tenant (galería + storage)
--
-- Objetivo: darle a CADA fila de user_products su propia galería
-- de imágenes (array), con límite configurable por negocio
-- (tenants.max_product_images), servidas desde Supabase Storage.
--
-- MODELO:
--   user_products.imagenes text[]  -> orden de la galería (path/URL)
--   tenants.max_product_images     -> límite configurable por negocio
--   products_base.image_url        -> fallback (imagen default compartida)
--   user_custom_products.image_url -> fallback para custom (legacy)
--
-- STORAGE:
--   Bucket PUBLIC 'product-images' porque la tienda es pública:
--   el navegador del cliente muestra las imágenes SIN autenticarse.
--   Path: {tenant_id}/{user_products_id}/{uuid}.{ext}
--   La carpeta por tenant habilita la policy de aislamiento:
--   "un usuario autenticado solo escribe en la carpeta de SU tenant".
--
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
-- ============================================================

BEGIN;

-- ============================================================
-- 1) ESQUEMA: columnas nuevas
-- ============================================================

-- Galería de imágenes por producto del tenant
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS imagenes text[] NOT NULL DEFAULT '{}';

-- Hard cap de seguridad (el límite real por negocio vive en tenants)
ALTER TABLE public.user_products
  DROP CONSTRAINT IF EXISTS user_products_imagenes_max_check;
ALTER TABLE public.user_products
  ADD CONSTRAINT user_products_imagenes_max_check
  CHECK (cardinality(imagenes) <= 10);

-- Límite configurable por negocio (1 a 10, default 3)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS max_product_images int NOT NULL DEFAULT 3;
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_max_product_images_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_max_product_images_check
  CHECK (max_product_images BETWEEN 1 AND 10);

-- ============================================================
-- 2) STORAGE: bucket público de imágenes de productos
-- ============================================================

-- public = true -> las URLs se sirven sin auth (tienda pública).
-- Límite de 5MB y solo imágenes: evita abusos en un bucket público.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 3) STORAGE: policies de RLS sobre storage.objects
--
--    LECTURA: cualquiera (anon + authenticated) -> tienda pública.
--    ESCRITURA: solo usuarios del MISMO tenant de la carpeta,
--               o super_admin (que gestiona todos los negocios).
--    split_part(name, '/', 1) = primer segmento del path = tenant_id.
--    (Se usa split_part en vez de storage.foldername() para no depender
--     de helpers del schema storage, que varían entre versiones.)
-- ============================================================

DROP POLICY IF EXISTS "product images public read" ON storage.objects;
CREATE POLICY "product images public read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product images insert own tenant" ON storage.objects;
CREATE POLICY "product images insert own tenant"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin()
      OR split_part(name, '/', 1) = public.current_tenant_id()::text
    )
  );

DROP POLICY IF EXISTS "product images update own tenant" ON storage.objects;
CREATE POLICY "product images update own tenant"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin()
      OR split_part(name, '/', 1) = public.current_tenant_id()::text
    )
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin()
      OR split_part(name, '/', 1) = public.current_tenant_id()::text
    )
  );

DROP POLICY IF EXISTS "product images delete own tenant" ON storage.objects;
CREATE POLICY "product images delete own tenant"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin()
      OR split_part(name, '/', 1) = public.current_tenant_id()::text
    )
  );

-- ============================================================
-- 4) VERIFICACION
-- ============================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_products'
  AND column_name = 'imagenes';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tenants'
  AND column_name = 'max_product_images';

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'product-images';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'product images%'
ORDER BY policyname;

COMMIT;
