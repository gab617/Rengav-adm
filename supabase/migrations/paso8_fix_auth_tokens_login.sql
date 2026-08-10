-- ============================================================
-- PASO 8: Fix login "Database error querying schema" en usuarios
-- creados por admin_create_user (RPC server-side).
--
-- CAUSA RAZON: GoTrue escanea auth.users con tipos Go NO nulos
-- (string / bool / int). Si el INSERT del RPC deja esas columnas
-- en NULL (porque no las setea y el default del schema es NULL),
-- el login falla con "converting NULL to string is unsupported"
-- -> "Database error querying schema". Documentado en
-- supabase/auth#1940 y en la doc oficial de troubleshooting.
--
-- Este script:
--   1) DIAGNOSTICO: muestra defaults de las columnas y los
--      usuarios que tienen NULL (los rotos).
--   2) FIX DE DATOS: pone '' / false / 0 en los NULL existentes
--      (solo filas rotas; idempotente y defensivo por columna).
--   3) FIX DEL RPC: admin_create_user ahora setea TODAS las
--      columnas que GoTrue espera no nulas (espeja su INSERT).
--   4) VERIFICACION: re-consulta los usuarios afectados.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) DIAGNOSTICO
-- ============================================================

-- 1a) Defaults de las columnas que GoTrue escanea como NO nullables
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
  AND column_name IN (
    'confirmation_token', 'recovery_token',
    'email_change_token_new', 'email_change_token_current', 'email_change',
    'phone_change_token', 'phone_change', 'reauthentication_token',
    'is_sso_user', 'is_anonymous', 'email_change_confirm_status'
  )
ORDER BY column_name;

-- 1b) Usuarios con NULL en alguna columna escaneada (los rotos)
SELECT id, email,
       confirmation_token, recovery_token,
       email_change_token_new, email_change_token_current, email_change,
       phone_change_token, phone_change, reauthentication_token,
       is_sso_user, is_anonymous, email_change_confirm_status,
       raw_user_meta_data
FROM auth.users
WHERE confirmation_token IS NULL OR recovery_token IS NULL
   OR email_change_token_new IS NULL OR email_change_token_current IS NULL
   OR email_change IS NULL OR phone_change_token IS NULL
   OR phone_change IS NULL OR reauthentication_token IS NULL
   OR is_sso_user IS NULL OR is_anonymous IS NULL
   OR email_change_confirm_status IS NULL;

-- ============================================================
-- 2) FIX DE DATOS: rellenar los NULL en filas existentes
-- ============================================================

DO $$
DECLARE
  c text;
  text_cols text[] := ARRAY[
    'confirmation_token', 'recovery_token',
    'email_change_token_new', 'email_change_token_current', 'email_change',
    'phone_change_token', 'phone_change', 'reauthentication_token'
  ];
  bool_cols text[] := ARRAY['is_sso_user', 'is_anonymous'];
  int_cols  text[] := ARRAY['email_change_confirm_status'];
BEGIN
  FOREACH c IN ARRAY text_cols LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = c
    ) THEN
      EXECUTE format('UPDATE auth.users SET %I = %L WHERE %I IS NULL', c, '', c);
    END IF;
  END LOOP;

  FOREACH c IN ARRAY bool_cols LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = c
    ) THEN
      EXECUTE format('UPDATE auth.users SET %I = false WHERE %I IS NULL', c, c);
    END IF;
  END LOOP;

  FOREACH c IN ARRAY int_cols LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = c
    ) THEN
      EXECUTE format('UPDATE auth.users SET %I = 0 WHERE %I IS NULL', c, c);
    END IF;
  END LOOP;
END $$;

-- Consistencia con el usuario sano: email_verified en raw_user_meta_data
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('email_verified', true)
WHERE raw_user_meta_data IS NULL OR raw_user_meta_data = '{}'::jsonb;

-- ============================================================
-- 3) FIX DEL RPC: setear todas las columnas que GoTrue espera
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_tenant_id bigint,
  p_parent_admin_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_tenant bigint;
  v_email text;
  v_new_user_id uuid;
BEGIN
  -- ---------- permisos del caller ----------
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT role, tenant_id INTO v_caller_role, v_caller_tenant
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de origen no encontrado';
  END IF;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'No tenes permisos para crear usuarios';
  END IF;

  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Rol invalido: solo user o admin';
  END IF;

  IF v_caller_role = 'admin' AND p_tenant_id IS DISTINCT FROM v_caller_tenant THEN
    RAISE EXCEPTION 'No podes crear usuarios en otro negocio';
  END IF;

  -- ---------- validaciones de input ----------
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'El email es obligatorio';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  v_email := lower(trim(p_email));

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'Ya existe un usuario con ese email';
  END IF;

  -- ---------- 1) auth user (dispara on_auth_user_created -> profile) ----------
  -- Setea TODAS las columnas que GoTrue escanea como NO nulas, igual que
  -- su INSERT interno. Sin esto el login rompe con "Database error querying schema".
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current, email_change,
    email_change_confirm_status,
    phone_change_token, phone_change,
    reauthentication_token,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('email_verified', true),
    now(), now(),
    '', '',
    '', '', '',
    0,
    '', '',
    '',
    false, false
  )
  RETURNING id INTO v_new_user_id;

  -- ---------- 2) identidad para login email+password ----------
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_email,
    v_new_user_id,
    jsonb_build_object(
      'sub', v_new_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(), now(), now()
  );

  -- ---------- 3) actualizar el profile creado por el trigger ----------
  UPDATE public.profiles
  SET name = trim(p_name),
      role = p_role,
      tenant_id = p_tenant_id,
      parent_admin_id = p_parent_admin_id
  WHERE id = v_new_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El profile no fue creado correctamente';
  END IF;

  RETURN v_new_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, text, bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, bigint, uuid) TO authenticated;

-- ============================================================
-- 4) VERIFICACION: estado final de los usuarios afectados
-- ============================================================

SELECT id, email,
       confirmation_token, recovery_token,
       email_change_token_new, email_change_token_current, email_change,
       phone_change_token, phone_change, reauthentication_token,
       is_sso_user, is_anonymous, email_change_confirm_status,
       raw_user_meta_data
FROM auth.users
WHERE email IN ('ciroman@gmail.com', 'cirito5@gmaio.com', 'test@gmail.com')
ORDER BY email;

COMMIT;
