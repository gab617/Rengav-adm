-- ============================================================
-- PASO 19: Rate-limit + honeypot en pedido_crear
--
-- El checkout del storefront corre como rol anon (no hay login),
-- asi que cualquiera puede llamar la RPC. La integridad de datos
-- y la privacidad ya estan cubiertas (RLS + validaciones del
-- paso 18), pero un bot puede spamear pedidos falsos. Este paso
-- cierra ese flanco con DOS defensas baratas y sin friccion
-- para el cliente real:
--
--   1) HONEYPOT: el formulario manda un campo oculto
--      (p_cliente->>'honeypot'). Un bot rellena campos a ciegas;
--      si viene con contenido, rechazamos sin avisar el motivo.
--   2) RATE LIMIT: max 3 pedidos por telefono en la ultima hora
--      (los cancelados no cuentan: puede ser un cliente que se
--      equivoco). Un cliente real no pide 4 veces en una hora.
--
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
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
  v_producto_id     uuid;
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
    v_producto_id := (v_item->>'producto_id')::uuid;
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
         LIKE '%demasiados_pedidos%') AS tiene_rate_limit,
       (SELECT pg_get_functiondef('public.pedido_crear(text, jsonb, jsonb)'::regprocedure)
         LIKE '%spam_detectado%') AS tiene_honeypot;

COMMIT;
