-- ============================================================
-- PASO 29: Renombrar metodo_pago 'tienda' → 'efectivo'
--
-- IMPORTANTE: Ejecutar ESTE script, NO el anterior.
-- ============================================================

BEGIN;

-- 1) Dropear constraint vieja PRIMERO (antes de cualquier UPDATE)
ALTER TABLE public.user_sales
  DROP CONSTRAINT IF EXISTS user_sales_metodo_pago_check;

-- 2) Actualizar datos existentes
UPDATE public.user_sales
SET metodo_pago = 'efectivo'
WHERE metodo_pago = 'tienda';

-- 3) Crear constraint nueva
ALTER TABLE public.user_sales
  ADD CONSTRAINT user_sales_metodo_pago_check
    CHECK (metodo_pago IN ('efectivo', 'transferencia'));

-- 4) Actualizar default
ALTER TABLE public.user_sales
  ALTER COLUMN metodo_pago SET DEFAULT 'efectivo';

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_sales'
  AND column_name = 'metodo_pago';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.user_sales'::regclass
  AND conname = 'user_sales_metodo_pago_check';

SELECT metodo_pago, count(*)
FROM public.user_sales
GROUP BY metodo_pago;

COMMIT;
