-- ============================================================
-- PASO 18: Pedidos web (checkout del storefront)
--
-- Objetivo: registrar los pedidos que llegan desde la tienda
-- online en la DB compartida. El STOREFRONT (key anon) NO toca
-- la tabla directamente: SOLO ejecuta la RPC public.pedido_crear
-- (SECURITY DEFINER), que valida la sucursal por slug, los items
-- y recalcula el subtotal del lado del servidor.
--
-- El admin (authenticated) lee los pedidos de SU tenant y puede
-- cambiar el estado (pendiente -> confirmado/cancelado) cuando
-- registre la venta desde el panel. Los pedidos NO descuentan
-- stock aca: eso sigue pasando en el flujo de ventas del admin.
--
-- ADEMAS agrega telefono_whatsapp a los settings (para el boton
-- "enviar pedido por WhatsApp" del storefront) y redefine la RPC
-- storefront_get_sucursal para exponerlo en settings.
--
-- Idempotente: se puede re-ejecutar sin romper nada.
-- Aplicar desde Supabase SQL Editor (seleccionar TODA la query).
-- ============================================================

BEGIN;

-- ============================================================
-- 1) TELEFONO WHATSAPP EN SETTINGS
--    Lo configura el admin (panel o tabla) y el storefront lo
--    usa para armar el link wa.me del pedido.
-- ============================================================

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS telefono_whatsapp text;

ALTER TABLE public.sucursal_settings
  ADD COLUMN IF NOT EXISTS telefono_whatsapp text;

-- ------------------------------------------------------------
-- 1.1) Redefinir storefront_get_sucursal para exponer
--      telefono_whatsapp dentro de settings (mismo contrato
--      de paso16 + el campo nuevo, cascada sucursal -> tenant).
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
      'logo_url',          COALESCE(v_ss.logo_url, v_ts.logo_url),
      'hero_url',          COALESCE(v_ss.hero_url, v_ts.hero_url),
      'lema',              COALESCE(v_ss.lema, v_ts.lema),
      'descripcion',       COALESCE(v_ss.descripcion, v_ts.descripcion),
      'theme',             v_theme,
      'telefono_whatsapp', COALESCE(v_ss.telefono_whatsapp, v_ts.telefono_whatsapp)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storefront_get_sucursal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_get_sucursal(text) TO anon, authenticated;

-- ============================================================
-- 2) TABLA PEDIDOS
--    Items y cliente en JSONB (snapshot). subtotal calculado
--    en la RPC. El admin re-verifica precios/stock al registrar
--    la venta.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pedidos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  cliente    jsonb NOT NULL,
  items      jsonb NOT NULL,
  subtotal   numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  estado     text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'cancelado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pedidos_profile_id_idx  ON public.pedidos (profile_id);
CREATE INDEX IF NOT EXISTS pedidos_estado_idx      ON public.pedidos (estado);
CREATE INDEX IF NOT EXISTS pedidos_created_at_idx  ON public.pedidos (created_at DESC);

DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- anon NO toca la tabla (solo vía la RPC).
REVOKE ALL ON public.pedidos FROM anon;
GRANT SELECT, UPDATE ON public.pedidos TO authenticated;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- super_admin: todo.
DROP POLICY IF EXISTS "pedidos super admin all" ON public.pedidos;
CREATE POLICY "pedidos super admin all"
  ON public.pedidos
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- admin: SELECT de pedidos de SU tenant.
DROP POLICY IF EXISTS "pedidos admin tenant select" ON public.pedidos;
CREATE POLICY "pedidos admin tenant select"
  ON public.pedidos
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = pedidos.profile_id
      AND p.tenant_id = public.current_tenant_id()
  ));

-- admin: UPDATE de estado de pedidos de SU tenant.
DROP POLICY IF EXISTS "pedidos admin tenant update" ON public.pedidos;
CREATE POLICY "pedidos admin tenant update"
  ON public.pedidos
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = pedidos.profile_id
      AND p.tenant_id = public.current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = pedidos.profile_id
      AND p.tenant_id = public.current_tenant_id()
  ));

-- ============================================================
-- 3) RPC pedido_crear(p_slug, p_cliente, p_items)
--    Valida sucursal, cliente e items; recalcula el subtotal
--    del lado del servidor; inserta y devuelve el pedido.
--    Devuelve {error} ante validaciones (convencion del
--    storefront) y no descuenta stock (eso lo hace el admin).
-- ============================================================

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
-- 4) VERIFICACION
-- ============================================================

SELECT 'settings' AS seccion,
       (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tenant_settings'
          AND column_name = 'telefono_whatsapp')  AS tenant_tiene_telefono,
       (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sucursal_settings'
          AND column_name = 'telefono_whatsapp')  AS sucursal_tiene_telefono;

SELECT 'pedidos' AS seccion,
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'pedidos') AS tabla_existe;

SELECT p.policyname, p.tablename, p.cmd
FROM pg_policies p
WHERE p.schemaname = 'public' AND p.tablename = 'pedidos'
ORDER BY p.policyname;

SELECT p.proname, p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('pedido_crear', 'storefront_get_sucursal');

COMMIT;
