-- ============================================================
-- PASO 3: Policies de fila propia en user_preferences
-- user_preferences es 100% personal: cada usuario solo toca SU fila.
-- El hook usePreferencesUser.jsx crea la fila lazy desde el cliente,
-- asi que hace falta INSERT propio (ademas de SELECT/UPDATE).
-- Idempotente.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "Users can select own preferences" ON public.user_preferences;
CREATE POLICY "Users can select own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
