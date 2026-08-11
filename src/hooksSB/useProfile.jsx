import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId) {
      if (!userId) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, name, tenant_id, parent_admin_id")
        .eq("id", userId)
        .single();

      if (!error && mounted) {
        setProfile(data);
      }

      if (mounted) setLoading(false);
    }

    async function handleSession(session) {
      await loadProfile(session?.user?.id ?? null);
    }

    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      handleSession(data.session);
    });

    // Reaccionar a login/logout/refresh sin recargar la página
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "TOKEN_REFRESHED") return;
        handleSession(session);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { profile, loadingProfile };
}
