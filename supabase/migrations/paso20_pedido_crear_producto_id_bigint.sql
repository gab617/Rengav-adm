-- ============================================================
-- PASO 20: Fix tipo de producto_id en pedido_crear
--
-- BUG: storefront_get_catalogo devuelve 'id', up.id y
-- user_products.id es un ENTERO (serial), NO uuid. La RPC
-- pedido_crear casteaba (v_item->>'producto_id')::uuid y
-- reventaba con:
--    invalid input syntax for type uuid: "1091"
--
-- Fix: v_producto_id pasa a bigint (cubre int y bigint) y el
-- cast a ::bigint. El comparador up.id = v_producto_id sigue
-- funcionando (Postgres promueve int a bigint en la comparacion).
-- El cliente (carrito) ya manda el id numerico tal cual sale
-- del catalogo, asi que no hay que tocar el storefront.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.pedido_crear(p_slug text, p_cliente jsonb, p_items jsonb)
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

  INSERT INTO public.pedidos (profile_id, cliente, items, subtotal)
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
    v_subtotal
  )
  RETURNING id, created_at, estado INTO v_pedido_id, v_created_at, v_estado;

  RETURN jsonb_build_object(
    'id',         v_pedido_id,
    'created_at', v_created_at,
    'estado',     v_estado,
    'subtotal',   v_subtotal
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pedido_crear(text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pedido_crear(text, jsonb, jsonb) TO anon, authenticated;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT 'pedido_crear' AS seccion,
       (SELECT pg_get_functiondef('public.pedido_crear(text, jsonb, jsonb)'::regprocedure)
         LIKE '%::bigint%') AS producto_id_es_bigint;

COMMIT;
