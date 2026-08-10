-- ============================================================
-- PASO 10: Imagen default GLOBAL del catálogo base
--
-- Objetivo: garantizar que products_base.image_url exista, ya
-- que actúa como fallback GLOBAL: todos los negocios muestran
-- esta imagen salvo que tengan su propia galería en
-- user_products.imagenes[].
--
-- MODELO FINAL (confirmado con el dueño):
--   products_base.image_url        -> imagen default GLOBAL (la
--                                      define el super_admin en
--                                      /admin/prods-base)
--   user_products.imagenes[]       -> galería PER-NEGOCIO; si
--                                      tiene fotos, reemplaza la
--                                      default. La posición 0 es
--                                      la imagen PRINCIPAL.
--   user_custom_products.image_url -> fallback para custom (legacy)
--
-- STORAGE:
--   Mismo bucket público 'product-images' (paso9).
--   La imagen default del catálogo se sube a: base/{producto_id}/{uuid}.{ext}
--   Las policies del paso9 ya permiten que super_admin escriba en
--   cualquier path (is_super_admin()); un admin de tenant NO puede
--   escribir en 'base/...' porque split_part('base', '/', 1) != su tenant.
--
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
-- ============================================================

BEGIN;

-- ============================================================
-- 1) ESQUEMA: columna image_url en products_base (si faltara)
-- ============================================================

ALTER TABLE public.products_base
  ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================
-- 2) STORAGE: garantizar bucket público (mismo del paso9)
-- ============================================================

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
-- 3) STORAGE: policies (refuerzo idempotente del paso9)
--    LECTURA: pública. ESCRITURA: super_admin siempre, o
--    usuario del MISMO tenant de la carpeta.
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

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products_base'
  AND column_name = 'image_url';

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'product-images';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'product images%'
ORDER BY policyname;

COMMIT;
