-- ============================================================
-- PASO 30: Redes sociales en settings (Facebook, Instagram, X)
--
-- El negocio puede cargar el link de sus redes para que la
-- tienda las muestre. Mismo esquema que telefono_whatsapp /
-- datos de transferencia: tenant base + cascada sucursal,
-- expuestos SOLO de lectura via storefront_get_sucursal.
-- anon no puede escribirlos (RLS/grants existentes).
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Columnas de redes sociales en settings
-- ------------------------------------------------------------

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS facebook_url text;

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS instagram_url text;

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS x_url text;

ALTER TABLE public.sucursal_settings
  ADD COLUMN IF NOT EXISTS facebook_url text;

ALTER TABLE public.sucursal_settings
  ADD COLUMN IF NOT EXISTS instagram_url text;

ALTER TABLE public.sucursal_settings
  ADD COLUMN IF NOT EXISTS x_url text;

-- ------------------------------------------------------------
-- 2) storefront_get_sucursal expone los links (solo lectura)
--    Ultima version vigente: paso21. Se re-crea igual pero con
--    las redes sociales en la cascada.
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
      'logo_url',           COALESCE(v_ss.logo_url, v_ts.logo_url),
      'hero_url',           COALESCE(v_ss.hero_url, v_ts.hero_url),
      'lema',               COALESCE(v_ss.lema, v_ts.lema),
      'descripcion',        COALESCE(v_ss.descripcion, v_ts.descripcion),
      'theme',              v_theme,
      'telefono_whatsapp',  COALESCE(v_ss.telefono_whatsapp, v_ts.telefono_whatsapp),
      'alias_transferencia', COALESCE(v_ss.alias_transferencia, v_ts.alias_transferencia),
      'cbu_transferencia',   COALESCE(v_ss.cbu_transferencia, v_ts.cbu_transferencia),
      'facebook_url',        COALESCE(v_ss.facebook_url, v_ts.facebook_url),
      'instagram_url',       COALESCE(v_ss.instagram_url, v_ts.instagram_url),
      'x_url',               COALESCE(v_ss.x_url, v_ts.x_url)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storefront_get_sucursal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_get_sucursal(text) TO anon, authenticated;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT 'settings' AS seccion,
       (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sucursal_settings'
          AND column_name IN ('facebook_url', 'instagram_url', 'x_url')) AS sucursal_tiene_redes,
       (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tenant_settings'
          AND column_name IN ('facebook_url', 'instagram_url', 'x_url')) AS tenant_tiene_redes;

SELECT 'storefront_get_sucursal' AS seccion,
       (pg_get_functiondef('public.storefront_get_sucursal(text)'::regprocedure)
         LIKE '%instagram_url%') AS expone_redes;

COMMIT;
