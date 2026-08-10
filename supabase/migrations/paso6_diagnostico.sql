-- Firmas exactas + tipo de retorno + definicion completa
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_super_admin', 'current_tenant_id')
ORDER BY p.proname, args;

-- Definicion completa de current_tenant_id (para replicar el body exacto)
SELECT pg_get_functiondef(p.oid) AS definicion_current_tenant_id
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'current_tenant_id';
