-- ============================================================
-- PASO 16: Contrato público del STOREFRONT (tienda online)
--
-- Objetivo: dejar la DB lista para que un proyecto PARALELO
-- (tienda por sucursal) consuma el MISMO Supabase SIN acceso
-- a datos internos. Todo el acceso público pasa por RPCs
-- SECURITY DEFINER de SOLO LECTURA (el "contrato").
--
-- CONTEXTO / MODELO (confirmado con el dueño):
--   La tienda online vende, para cada sucursal (profile role=user
--   con tenant_id), su CATALOGO: user_products activos con su
--   precio_venta e imágenes. La DB es compartida; la tienda se
--   conecta con la key ANON y SOLO puede llamar a las RPCs.
--
-- ESTE PASO AGREGA 3 COSAS:
--   1) SLUGS  -> tenants.slug y profiles.slug (URLs estables,
--                auto-generados desde el nombre, editables,
--                únicos, y ESTABLES: renombrar no los regenera).
--   2) SETTINGS DE BRANDING -> tenant_settings y sucursal_settings
--                (1:1). Guardan tokens de diseño (theme JSONB),
--                logo y hero. El storefront resuelve la CASCADA:
--                sucursal -> tenant -> default.
--   3) RPCs PÚBLICAS -> storefront_get_sucursal y
--                storefront_get_catalogo. SECURITY DEFINER,
--                ejecutables por anon. NUNCA exponen precio_compra,
--                datos internos ni stock exacto (solo disponibilidad).
--
-- BRANDING EN STORAGE:
--   Se reutiliza el bucket público 'product-images' (paso9).
--   Logo/hero se suben en: {tenant_id}/branding/{archivo}.{ext}
--   Las policies del paso9 ya permiten escritura al admin del
--   tenant y lectura pública.
--
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
-- ============================================================

BEGIN;

-- ============================================================
-- 1) SLUGS
-- ============================================================

-- ------------------------------------------------------------
-- 1.1) Función helper: nombre -> slug
--      minúsculas, sin tildes, espacios/símbolos -> guiones
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugify(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(
    regexp_replace(
      translate(
        trim(coalesce(p_text, '')),
        'áéíóúüñÁÉÍÓÚÜÑ',
        'aeiouunAEIOUUN'
      ),
      '[^a-z0-9]+', '-', 'g'
    ),
    '^[-]+|[-]+$', '', 'g'
  ))
$$;

-- ------------------------------------------------------------
-- 1.2) Columnas slug (nullable: super_admin y roles sin tenant
--      no necesitan tienda)
-- ------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug text;

-- Unicidad: tenant único global; sucursal única DENTRO de su tenant
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key
  ON public.tenants (slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_slug_key
  ON public.profiles (tenant_id, slug)
  WHERE slug IS NOT NULL;

-- ------------------------------------------------------------
-- 1.3) Trigger de auto-generación: TENANTS
--      Se genera SOLO si el slug está vacío (estabilidad:
--      renombrar el negocio NO regenera la URL).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_generate_tenant_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_n int := 1;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    v_base := public.slugify(NEW.name);

    IF v_base = '' THEN
      NEW.slug := NULL;
      RETURN NEW;
    END IF;

    v_candidate := v_base;
    WHILE EXISTS (
      SELECT 1 FROM public.tenants
      WHERE slug = v_candidate AND id IS DISTINCT FROM NEW.id
    ) LOOP
      v_n := v_n + 1;
      v_candidate := v_base || '-' || v_n;
    END LOOP;

    NEW.slug := v_candidate;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_auto_slug ON public.tenants;
CREATE TRIGGER trg_tenants_auto_slug
  BEFORE INSERT OR UPDATE OF name, slug
  ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_tenant_slug();

-- ------------------------------------------------------------
-- 1.4) Trigger de auto-generación: PROFILES (sucursales)
--      Igual criterio + no genera si el user no tiene tenant.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_generate_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_n int := 1;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.slug := NULL;
    RETURN NEW;
  END IF;

  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    v_base := public.slugify(NEW.name);

    IF v_base = '' THEN
      NEW.slug := NULL;
      RETURN NEW;
    END IF;

    v_candidate := v_base;
    WHILE EXISTS (
      SELECT 1 FROM public.profiles
      WHERE tenant_id = NEW.tenant_id
        AND slug = v_candidate
        AND id IS DISTINCT FROM NEW.id
    ) LOOP
      v_n := v_n + 1;
      v_candidate := v_base || '-' || v_n;
    END LOOP;

    NEW.slug := v_candidate;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_auto_slug ON public.profiles;
CREATE TRIGGER trg_profiles_auto_slug
  BEFORE INSERT OR UPDATE OF name, slug, tenant_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_profile_slug();

-- ------------------------------------------------------------
-- 1.5) Backfill: genera slug para los registros existentes
--      (SET slug = NULL dispara el trigger -> genera desde name)
-- ------------------------------------------------------------
UPDATE public.tenants
SET slug = NULL
WHERE slug IS NULL OR slug = '';

UPDATE public.profiles
SET slug = NULL
WHERE (slug IS NULL OR slug = '') AND tenant_id IS NOT NULL;

-- ============================================================
-- 2) SETTINGS DE BRANDING (tokens de diseño)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   bigint NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url    text,
  hero_url    text,
  lema        text,
  descripcion text,
  theme       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sucursal_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  logo_url    text,
  hero_url    text,
  lema        text,
  descripcion text,
  theme       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_settings_updated_at ON public.tenant_settings;
CREATE TRIGGER trg_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sucursal_settings_updated_at ON public.sucursal_settings;
CREATE TRIGGER trg_sucursal_settings_updated_at
  BEFORE UPDATE ON public.sucursal_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 2.1) Grants: anon NO toca estas tablas (solo vía RPCs).
--      authenticated las lee/escribe bajo RLS.
-- ------------------------------------------------------------
REVOKE ALL ON public.tenant_settings FROM anon;
REVOKE ALL ON public.sucursal_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.tenant_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sucursal_settings TO authenticated;

-- ------------------------------------------------------------
-- 2.2) RLS: tenant_settings
--      super_admin: todo. admin: solo su propio negocio.
-- ------------------------------------------------------------
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant settings super admin all" ON public.tenant_settings;
CREATE POLICY "tenant settings super admin all"
  ON public.tenant_settings
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "tenant settings admin select" ON public.tenant_settings;
CREATE POLICY "tenant settings admin select"
  ON public.tenant_settings
  FOR SELECT
  TO authenticated
  USING (public.current_tenant_id() = tenant_id);

DROP POLICY IF EXISTS "tenant settings admin insert" ON public.tenant_settings;
CREATE POLICY "tenant settings admin insert"
  ON public.tenant_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_tenant_id() = tenant_id);

DROP POLICY IF EXISTS "tenant settings admin update" ON public.tenant_settings;
CREATE POLICY "tenant settings admin update"
  ON public.tenant_settings
  FOR UPDATE
  TO authenticated
  USING (public.current_tenant_id() = tenant_id)
  WITH CHECK (public.current_tenant_id() = tenant_id);

-- ------------------------------------------------------------
-- 2.3) RLS: sucursal_settings
--      super_admin: todo. admin: filas de sucursales de SU tenant.
-- ------------------------------------------------------------
ALTER TABLE public.sucursal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sucursal settings super admin all" ON public.sucursal_settings;
CREATE POLICY "sucursal settings super admin all"
  ON public.sucursal_settings
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "sucursal settings admin select" ON public.sucursal_settings;
CREATE POLICY "sucursal settings admin select"
  ON public.sucursal_settings
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = sucursal_settings.profile_id
      AND p.tenant_id = public.current_tenant_id()
  ));

DROP POLICY IF EXISTS "sucursal settings admin insert" ON public.sucursal_settings;
CREATE POLICY "sucursal settings admin insert"
  ON public.sucursal_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = sucursal_settings.profile_id
      AND p.tenant_id = public.current_tenant_id()
  ));

DROP POLICY IF EXISTS "sucursal settings admin update" ON public.sucursal_settings;
CREATE POLICY "sucursal settings admin update"
  ON public.sucursal_settings
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = sucursal_settings.profile_id
      AND p.tenant_id = public.current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = sucursal_settings.profile_id
      AND p.tenant_id = public.current_tenant_id()
  ));

-- ============================================================
-- 3) RPCs PÚBLICAS: EL CONTRATO DEL STOREFRONT
--
--   IMPORTANTE:
--   - SECURITY DEFINER: corren como el dueño (postgres) y
--     DEVUELVEN SOLO lo que el contrato define.
--   - anon NO tiene acceso a las tablas: la tienda (key anon)
--     SOLO puede ejecutar estas funciones.
--   - NUNCA se devuelve precio_compra ni stock exacto.
--     El stock se traduce a un estado de disponibilidad.
-- ============================================================

-- ------------------------------------------------------------
-- 3.1) storefront_get_sucursal(p_slug)
--      Identidad de la sucursal + su tenant + branding
--      resuelto en CASCADA (sucursal pisa a tenant).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storefront_get_sucursal(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_tenant  public.tenants%ROWTYPE;
  v_ss      public.sucursal_settings%ROWTYPE;
  v_ts      public.tenant_settings%ROWTYPE;
  v_theme   jsonb;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RETURN jsonb_build_object('error', 'slug_requerido');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE slug = lower(trim(p_slug))
    AND tenant_id IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'sucursal_no_encontrada');
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = v_profile.tenant_id;
  SELECT * INTO v_ts    FROM public.tenant_settings WHERE tenant_id = v_tenant.id;
  SELECT * INTO v_ss    FROM public.sucursal_settings WHERE profile_id = v_profile.id;

  -- CASCADA de theme: tenant base, sucursal pisa (operando derecho gana)
  v_theme := COALESCE(v_ts.theme, '{}'::jsonb) || COALESCE(v_ss.theme, '{}'::jsonb);

  RETURN jsonb_build_object(
    'sucursal', jsonb_build_object(
      'id',     v_profile.id,
      'nombre', v_profile.name,
      'slug',   v_profile.slug
    ),
    'tenant', jsonb_build_object(
      'id',     v_tenant.id,
      'nombre', v_tenant.name,
      'slug',   v_tenant.slug
    ),
    'settings', jsonb_build_object(
      'logo_url',    COALESCE(v_ss.logo_url, v_ts.logo_url),
      'hero_url',    COALESCE(v_ss.hero_url, v_ts.hero_url),
      'lema',        COALESCE(v_ss.lema, v_ts.lema),
      'descripcion', COALESCE(v_ss.descripcion, v_ts.descripcion),
      'theme',       v_theme
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storefront_get_sucursal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_get_sucursal(text) TO anon, authenticated;

-- ------------------------------------------------------------
-- 3.2) storefront_get_catalogo(p_slug)
--      Catálogo de una sucursal: user_products ACTIVOS.
--      Devuelve SOLO lo vendible; el stock exacto NO sale:
--      se traduce a 'en_stock' | 'ultimas_unidades' | 'agotado'
--      (umbral de últimas unidades: 5).
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

  SELECT COALESCE(jsonb_agg(prod ORDER BY prod->>'nombre'), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id',        up.id,
      'tipo',      CASE WHEN up.custom_id IS NOT NULL THEN 'custom' ELSE 'base' END,
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
-- 4) VERIFICACION
-- ============================================================

SELECT 'slugs' AS seccion,
       (SELECT count(*) FROM public.tenants  WHERE slug IS NOT NULL) AS tenants_con_slug,
       (SELECT count(*) FROM public.profiles WHERE slug IS NOT NULL) AS profiles_con_slug;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('tenant_settings', 'sucursal_settings')
ORDER BY table_name;

SELECT p.policyname, p.tablename, p.cmd
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN ('tenant_settings', 'sucursal_settings')
ORDER BY p.tablename, p.policyname;

SELECT p.proname, p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('storefront_get_sucursal', 'storefront_get_catalogo');

COMMIT;
