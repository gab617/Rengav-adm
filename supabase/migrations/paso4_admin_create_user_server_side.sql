-- ============================================================
-- PASO 4: admin_create_user server-side (sin signUp del cliente)
-- Reemplaza el flujo signUp + restore de sesión.
-- El RPC crea el auth user en auth.users, el trigger crea el
-- profile, inserta la identidad (para login email+password) y
-- actualiza el profile. Una sola transaccion atomica.
-- IMPORTANTE: toca auth.users / auth.identities (internals de
-- Supabase). Si algo falla, revierte todo y queda un error limpio.
-- Requiere pgcrypto (extensions.crypt) que viene por defecto.
-- ============================================================

BEGIN;

-- Elimina la version vieja (que esperaba el user ya creado por signUp)
DROP FUNCTION IF EXISTS public.admin_create_user(uuid, text, text, bigint, uuid);

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
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now()
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

COMMIT;
