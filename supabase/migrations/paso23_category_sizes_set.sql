-- ============================================================
-- PASO 23: category_sizes_set — reemplazo ATÓMICO de los talles
--          de una categoría en UNA sola petición (anti N+1).
--
-- Motivo: el panel de talles hacía 1 write + reload por toggle
-- (3 peticiones por click). Con esta función, el frontend pasa a
-- modo borrador + botón Guardar: 1 RPC reemplaza todos los talles
-- de la categoría en una transacción (delete + insert), con la
-- posición = orden del array (1-based, respeta el orden del panel).
--
-- Solo super_admin (mismo check que las policies de category_sizes).
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.category_sizes_set(
  p_category_id bigint,
  p_size_ids    bigint[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo super_admin puede configurar talles por categoría';
  END IF;

  DELETE FROM public.category_sizes
  WHERE category_id = p_category_id;

  IF p_size_ids IS NOT NULL AND array_length(p_size_ids, 1) > 0 THEN
    INSERT INTO public.category_sizes (category_id, size_id, position)
    SELECT p_category_id, tid, ord
    FROM unnest(p_size_ids) WITH ORDINALITY AS t(tid, ord);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.category_sizes_set(bigint, bigint[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.category_sizes_set(bigint, bigint[]) TO authenticated;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT p.proname, p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'category_sizes_set';
