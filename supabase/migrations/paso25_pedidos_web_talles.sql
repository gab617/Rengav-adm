-- ============================================================
-- PASO 25: Talle en pedidos web
--
-- BUG: el storefront manda `talle` por item (CheckoutForm),
-- pero pedido_crear lo botaba al normalizar: los items del pedido
-- guardaban solo producto_id, nombre, marca, cantidad,
-- precio_unitario e imagen. Resultado: al confirmar una venta
-- desde /pedidos-web, update_stocks recibia talle:null y NUNCA
-- descontaba el stock_talles del talle vendido (solo el stock
-- plano), mientras que en /productos si se descontaba.
--
-- Fix: pedido_crear persiste `talle` en cada item normalizado.
-- El admin ahora ve el talle al confirmar y confirmarPedido pasa
-- el talle al RPC update_stocks (ya soportado en paso24).
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

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
      'imagen',          v_item->>'imagen',
      'talle',           nullif(trim(coalesce(v_item->>'talle', '')), '')
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

SELECT 'pedido_crear' AS seccion,
       (SELECT pg_get_functiondef('public.pedido_crear(text, jsonb, jsonb, text)'::regprocedure)
         LIKE '%''talle''%') AS persiste_talle;

COMMIT;