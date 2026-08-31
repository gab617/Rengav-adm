-- ============================================================
-- PASO 24: TALLES EN EL FLUJO DE VENTAS
--
-- 1) user_sales_detail.talle text (nullable)
--    -> registra qué talle se vendió en cada detalle (para el
--       historial y el desglose). null = producto sin talles.
--
-- 2) update_stocks(products jsonb, uid uuid) ampliado:
--    Antes descontaba solo user_products.stock (general).
--    Ahora, si un elemento trae "talle" y el producto tiene
--    stock_talles definido, descuenta TAMBIEN ese talle en el
--    jsonb (clave = nombre del talle). Sin "talle" o con
--    stock_talles null, el comportamiento queda igual que antes
--    (solo stock general).
--
--    IMPORTANTE: se agrupa por producto ANTES del update.
--    Un UPDATE ... FROM que matchea la fila objetivo con varias
--    filas del FROM solo usa UNA de ellas (PostgreSQL), así que
--    si una venta lleva el mismo producto en 2 talles distintos,
--    el segundo talle nunca se restaba. Agrupando por producto
--    (stock total = suma) y por talle (jsonb_set acumulado) se
--    descuentan ambos correctamente y se preservan los talles
--    que no se vendieron.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.user_sales_detail
  ADD COLUMN IF NOT EXISTS talle text;

CREATE OR REPLACE FUNCTION public.update_stocks(products jsonb, uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  r record;
  det record;
  v_stock_talles jsonb;
begin
  for r in
    select
      (elem->>'id')::int as id_producto,
      sum(coalesce((elem->>'cantidad')::numeric, 0)) as stock_total,
      jsonb_agg(elem) as items
    from jsonb_array_elements(products) as elem
    group by (elem->>'id')::int
  loop
    select p.stock_talles
      into v_stock_talles
      from user_products p
      where p.id = r.id_producto
        and p.user_id = uid;

    -- Descontar por talle (solo si hay desglose definido).
    -- jsonb_set preserva el resto de las claves del objeto.
    if v_stock_talles is not null then
      for det in
        select elem->>'talle' as talle,
               sum(coalesce((elem->>'cantidad')::numeric, 0)) as cantidad
        from jsonb_array_elements(r.items) as elem
        where elem->>'talle' is not null
        group by elem->>'talle'
      loop
        v_stock_talles := jsonb_set(
          v_stock_talles,
          array[det.talle],
          to_jsonb(greatest(
            coalesce((v_stock_talles->>det.talle)::int, 0) - det.cantidad,
            0
          )::int)
        );
      end loop;
    end if;

    update user_products as p
    set stock = p.stock - r.stock_total,
        stock_talles = v_stock_talles
    where p.id = r.id_producto
      and p.user_id = uid;
  end loop;
end;
$function$;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_sales_detail'
  AND column_name = 'talle';

SELECT pg_get_functiondef(p.oid) AS update_stocks_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'update_stocks';
