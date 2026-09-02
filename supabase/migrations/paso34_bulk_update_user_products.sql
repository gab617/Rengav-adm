-- ============================================================
-- PASO 34: UPDATE MASIVO de user_products en UNA RPC
--
-- Razón: el admin hacía EDICIONES MASIVAS con N updates
-- individuales (un round-trip HTTP por producto). Esta RPC
-- procesa el array completo en UNA sola petición (dentro de
-- Postgres) y es ATOMICA: si un item falla al parsear, hace
-- rollback de todo el lote.
--
-- Seguridad (patrón del proyecto, ver paso7/15/24):
--   SECURITY DEFINER con validación EXPLÍCITA de pertenencia:
--     - super_admin: actualiza cualquier user_products.
--     - admin de tenant: solo user_products cuyo profile
--       (user_id) pertenezca a SU tenant (current_tenant_id()).
--   No se confía en el id del payload: la condición del WHERE
--   valida el acceso. Si el item no está permitido, se saltea y
--   se reporta en la respuesta.
--
-- Columnas actualizadas SOLO las del payload (precio_venta,
-- precio_compra, stock, stock_talles, descripcion, imagenes).
-- El resto (active, destacado, visible, fechas...) queda intacto.
-- La clave "id" identifica la fila (user_products.id es int,
-- NO uuid — ver paso20).
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.bulk_update_user_products(payloads jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  r record;
  v_id int;
  v_count int;
  v_updated int := 0;
  v_denied int := 0;
  v_ids int[] := '{}';
begin
  if payloads is null or jsonb_typeof(payloads) <> 'array' or jsonb_array_length(payloads) = 0 then
    raise exception 'payloads debe ser un array no vacío';
  end if;

  -- NOTA: el record r se arma con alias de columna EXPLICITOS (up_id,
  -- item). Con "select * from jsonb_array_elements(...) as elem", el
  -- campo del record cambia según la versión de PostgreSQL (elem o
  -- value), lo que rompe con "record r has no field elem".
  for r in
    select
      (elem->>'id')::int as up_id,
      elem               as item
    from jsonb_array_elements(payloads) as elem
  loop
    v_id := r.up_id;

    -- Se tocan SOLO las columnas cuyo campo viene en el payload:
    -- la key presente manda (incluso null/[]), la ausente preserva
    -- el valor actual de la fila.
    update public.user_products as up
       set precio_venta  = coalesce((r.item->>'precio_venta')::numeric,  up.precio_venta),
           precio_compra = coalesce((r.item->>'precio_compra')::numeric, up.precio_compra),
           stock         = coalesce((r.item->>'stock')::int,            up.stock),
           stock_talles  = case when r.item ? 'stock_talles'
                                then nullif(r.item->'stock_talles', 'null'::jsonb)
                                else up.stock_talles
                           end,
           descripcion   = case when r.item ? 'descripcion'
                                then r.item->>'descripcion'
                                else up.descripcion
                           end,
           imagenes      = case when r.item ? 'imagenes'
                                then array(select jsonb_array_elements_text(r.item->'imagenes'))
                                else up.imagenes
                           end
     where up.id = v_id
       and (
         public.is_super_admin()
         or exists (
           select 1 from public.profiles pr
           where pr.id = up.user_id
             and pr.tenant_id = public.current_tenant_id()
         )
       );

    get diagnostics v_count = row_count;
    if v_count > 0 then
      v_updated := v_updated + 1;
      v_ids := array_append(v_ids, v_id);
    else
      v_denied := v_denied + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ids',           to_jsonb(v_ids),
    'actualizados',  v_updated,
    'no_aplicados',  v_denied
  );
end;
$function$;

-- Solo authenticated puede invocarla (el admin usa el front con su sesión).
REVOKE ALL ON FUNCTION public.bulk_update_user_products(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_update_user_products(jsonb) TO authenticated;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT pg_get_functiondef(p.oid) AS bulk_update_user_products_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'bulk_update_user_products';