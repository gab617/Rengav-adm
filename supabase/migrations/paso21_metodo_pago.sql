-- ============================================================
-- PASO 21: Metodo de pago en pedidos + datos de transferencia
--
-- El pedido ahora sabe COMO va a pagar el cliente:
--   'tienda'        -> al retirar en la tienda (efectivo/QR del
--                      mostrador, lo decide el admin).
--   'transferencia' -> el cliente transfiere al alias/CBU del
--                      negocio antes de retirar.
--
-- Los datos de transferencia viven en settings (tenant base +
-- cascada sucursal, igual que telefono_whatsapp) y el storefront
-- los expone SOLO de lectura via storefront_get_sucursal. anon no
-- puede escribirlos (RLS/grants existentes); el unico que los
-- modifica es el admin logueado. El CBU/alias NO es secreto:
-- sirve para que le depositen, no para retirar.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) metodo_pago en pedidos (default 'tienda' para filas viejas)
-- ------------------------------------------------------------

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS metodo_pago text NOT NULL DEFAULT 'tienda';

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_metodo_pago_check;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_metodo_pago_check
    CHECK (metodo_pago IN ('tienda', 'transferencia'));

-- ------------------------------------------------------------
-- 2) Datos de transferencia en settings
-- ------------------------------------------------------------

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS alias_transferencia text;

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS cbu_transferencia text;

ALTER TABLE public.sucursal_settings
  ADD COLUMN IF NOT EXISTS alias_transferencia text;

ALTER TABLE public.sucursal_settings
  ADD COLUMN IF NOT EXISTS cbu_transferencia text;

-- ------------------------------------------------------------
-- 3) storefront_get_sucursal expone los datos (solo lectura)
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
      'cbu_transferencia',   COALESCE(v_ss.cbu_transferencia, v_ts.cbu_transferencia)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storefront_get_sucursal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_get_sucursal(text) TO anon, authenticated;

-- ------------------------------------------------------------
-- 4) pedido_crear con p_metodo_pago
--    Se dropea la firma vieja (3 args) para no dejar funciones
--    huerfanas.
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS public.pedido_crear(text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.pedido_crear(p_slug text, p_cliente jsonb, p_items jsonb, p_metodo_pago text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_item            jsonb;
  v_producto_id     bigint;
  v_cantidad        int;
  v_precio          numeric;
  v_nombre          text;
  v_telefono        text;
  v_email           text;
  v_direccion       text;
  v_notas           text;
  v_metodo_pago     text;
  v_items_normalized jsonb := '[]'::jsonb;
  v_subtotal        numeric := 0;
  v_pedido_id       uuid;
  v_created_at      timestamptz;
  v_estado          text;
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

  IF p_cliente IS NULL OR jsonb_typeof(p_cliente) <> 'object' THEN
    RETURN jsonb_build_object('error', 'cliente_invalido');
  END IF;

  v_nombre    := nullif(trim(coalesce(p_cliente->>'nombre', '')), '');
  v_telefono  := nullif(trim(coalesce(p_cliente->>'telefono', '')), '');
  v_email     := nullif(trim(coalesce(p_cliente->>'email', '')), '');
  v_direccion := nullif(trim(coalesce(p_cliente->>'direccion', '')), '');
  v_notas     := nullif(trim(coalesce(p_cliente->>'notas', '')), '');

  IF v_nombre IS NULL OR v_telefono IS NULL THEN
    RETURN jsonb_build_object('error', 'cliente_incompleto');
  END IF;

  -- METODO DE PAGO: null -> 'tienda'; invalido -> error.
  v_metodo_pago := nullif(lower(coalesce(trim(p_metodo_pago), 'tienda')), '');
  IF v_metodo_pago NOT IN ('tienda', 'transferencia') THEN
    RETURN jsonb_build_object('error', 'metodo_pago_invalido');
  END IF;

  -- HONEYPOT: campo oculto del formulario. Si viene con contenido,
  -- es un bot rellenando campos a ciegas -> rechazar sin dar pistas.
  IF nullif(trim(coalesce(p_cliente->>'honeypot', '')), '') IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'spam_detectado');
  END IF;

  -- RATE LIMIT: max 3 pedidos por telefono en la ultima hora.
  -- Los cancelados no cuentan (cliente que se equivoco no debe
  -- quedar bloqueado). Mata el spam de bots sin molestar al cliente.
  IF (SELECT count(*)
      FROM public.pedidos p
      WHERE p.profile_id = v_profile.id
        AND p.created_at >= now() - interval '1 hour'
        AND p.estado <> 'cancelado'
        AND p.cliente->>'telefono' = v_telefono) >= 3 THEN
    RETURN jsonb_build_object('error', 'demasiados_pedidos');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'items_vacios');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_producto_id := (v_item->>'producto_id')::bigint;
    v_cantidad    := (v_item->>'cantidad')::int;
    v_precio      := (v_item->>'precio_unitario')::numeric;

    IF v_producto_id IS NULL OR v_cantidad IS NULL OR v_cantidad < 1
       OR v_precio IS NULL OR v_precio < 0 THEN
      RETURN jsonb_build_object('error', 'item_invalido');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_products up
      WHERE up.id = v_producto_id AND up.user_id = v_profile.id
    ) THEN
      RETURN jsonb_build_object('error', 'producto_invalido');
    END IF;

    v_items_normalized := v_items_normalized || jsonb_build_object(
      'producto_id',     v_producto_id,
      'nombre',          coalesce(v_item->>'nombre', ''),
      'marca',           coalesce(v_item->>'marca', ''),
      'cantidad',        v_cantidad,
      'precio_unitario', v_precio,
      'imagen',          v_item->>'imagen'
    );

    v_subtotal := v_subtotal + (v_cantidad * v_precio);
  END LOOP;

  INSERT INTO public.pedidos (profile_id, cliente, items, subtotal, metodo_pago)
  VALUES (
    v_profile.id,
    jsonb_build_object(
      'nombre',    v_nombre,
      'telefono',  v_telefono,
      'email',     v_email,
      'direccion', v_direccion,
      'notas',     v_notas
    ),
    v_items_normalized,
    v_subtotal,
    v_metodo_pago
  )
  RETURNING id, created_at, estado INTO v_pedido_id, v_created_at, v_estado;

  RETURN jsonb_build_object(
    'id',            v_pedido_id,
    'created_at',    v_created_at,
    'estado',        v_estado,
    'subtotal',      v_subtotal,
    'metodo_pago',   v_metodo_pago
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pedido_crear(text, jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pedido_crear(text, jsonb, jsonb, text) TO anon, authenticated;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT 'pedidos' AS seccion,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'pedidos'
                 AND column_name = 'metodo_pago') AS tiene_metodo_pago;

SELECT 'settings' AS seccion,
       (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sucursal_settings'
          AND column_name IN ('alias_transferencia', 'cbu_transferencia')) AS sucursal_tiene_datos,
       (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tenant_settings'
          AND column_name IN ('alias_transferencia', 'cbu_transferencia')) AS tenant_tiene_datos;

SELECT 'pedido_crear' AS seccion,
       (SELECT pg_get_functiondef('public.pedido_crear(text, jsonb, jsonb, text)'::regprocedure)
         LIKE '%metodo_pago%') AS acepta_metodo_pago;

COMMIT;
