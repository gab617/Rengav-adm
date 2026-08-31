-- ============================================================
-- PASO 33: Realtime para notificaciones de pedidos nuevos
--
-- Agrega la tabla pedidos a la publicación supabase_realtime
-- para que el panel admin reciba INSERTs en vivo.
--
-- REPLICA IDENTITY FULL: sin esto, los UPDATE/DELETE llegan con
-- old_record solo con la primary key. Con esto llega la fila
-- vieja completa (hoy solo nos interesan INSERTs, pero dejamos
-- el camino listo para el futuro).
--
-- RLS: postgres_changes respeta las policies SELECT. Los admins
-- reciben SOLO los eventos de pedidos que ya pueden leer
-- ("pedidos super admin all" / "pedidos admin tenant select",
-- paso18). anon no está suscripto a nada por sí mismo.
--
-- Idempotente. Aplicar desde Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Publicar la tabla para Realtime (si no lo estaba)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pedidos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Fila vieja completa en UPDATE/DELETE
-- ------------------------------------------------------------

ALTER TABLE public.pedidos REPLICA IDENTITY FULL;

-- ============================================================
-- VERIFICACION
-- ============================================================

SELECT 'publication' AS seccion,
       EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = 'pedidos'
       ) AS pedidos_publicados;

SELECT relreplident AS replica_identity
FROM pg_class
WHERE oid = 'public.pedidos'::regclass;
-- f=default, d=nada, i=indice, F=completa (FULL). Esperamos 'F'.

COMMIT;
