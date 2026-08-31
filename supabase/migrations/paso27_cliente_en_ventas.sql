-- ============================================================
-- PASO 27: Datos del cliente en ventas
--
-- Las ventas creadas desde pedidos web ahora guardan los datos
-- del cliente (nombre, telefono, email) directamente en
-- user_sales. Esto permite:
--   - Ver quién hizo la compra en el historial de ventas
--   - Filtrar ventas por nombre/teléfono/email del cliente
--   - Identificar compras recurrentes sin necesidad de JOINs
--
-- Las columnas son nullable: las ventas manuales (desde el
-- carrito del admin) no tienen cliente, quedan en NULL.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

ALTER TABLE public.user_sales
  ADD COLUMN IF NOT EXISTS cliente_nombre  text,
  ADD COLUMN IF NOT EXISTS cliente_telefono text,
  ADD COLUMN IF NOT EXISTS cliente_email   text;

-- Índice para búsquedas por teléfono (compras recurrentes)
CREATE INDEX IF NOT EXISTS user_sales_cliente_telefono_idx
  ON public.user_sales (cliente_telefono)
  WHERE cliente_telefono IS NOT NULL;

-- Índice para búsquedas por nombre (trgm para búsqueda parcial)
CREATE INDEX IF NOT EXISTS user_sales_cliente_nombre_idx
  ON public.user_sales (cliente_nombre)
  WHERE cliente_nombre IS NOT NULL;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_sales'
  AND column_name LIKE 'cliente_%'
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_sales'
  AND indexname LIKE 'user_sales_cliente_%';

COMMIT;
