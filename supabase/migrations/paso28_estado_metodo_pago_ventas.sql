-- ============================================================
-- PASO 28: Estado y método de pago en ventas manuales
--
-- Agrega 'estado' y 'metodo_pago' a user_sales para que las
-- ventas manuales (desde el carrito del admin) puedan:
--   - Marcarse como 'pendiente' (cobro pendiente) o
--     'confirmado' (default, cobrado).
--   - Registrar el método de pago: 'tienda' o 'transferencia'.
--
-- Default estado='confirmado' para no romper ventas existentes.
-- Default metodo_pago='tienda' para consistencia.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

ALTER TABLE public.user_sales
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'confirmado';

ALTER TABLE public.user_sales
  DROP CONSTRAINT IF EXISTS user_sales_estado_check;

ALTER TABLE public.user_sales
  ADD CONSTRAINT user_sales_estado_check
    CHECK (estado IN ('confirmado', 'pendiente'));

ALTER TABLE public.user_sales
  ADD COLUMN IF NOT EXISTS metodo_pago text NOT NULL DEFAULT 'tienda';

ALTER TABLE public.user_sales
  DROP CONSTRAINT IF EXISTS user_sales_metodo_pago_check;

ALTER TABLE public.user_sales
  ADD CONSTRAINT user_sales_metodo_pago_check
    CHECK (metodo_pago IN ('tienda', 'transferencia'));

-- Índice para filtrar por estado
CREATE INDEX IF NOT EXISTS user_sales_estado_idx
  ON public.user_sales (estado);

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_sales'
  AND column_name IN ('estado', 'metodo_pago')
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_sales'
  AND indexname = 'user_sales_estado_idx';

COMMIT;
