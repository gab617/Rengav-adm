import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";

const ProfileContext = createContext({ profile: null, loadingProfile: true });

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoading] = useState(true);
  const lastUserIdRef = useRef(undefined);

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
      const userId = session?.user?.id ?? null;
      // getSession() e INITIAL_SESSION llegan con la misma sesión al montar:
      // solo procesamos la primera para no duplicar la query a profiles.
      if (userId === lastUserIdRef.current) return;
      lastUserIdRef.current = userId;
      await loadProfile(userId);
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "TOKEN_REFRESHED") return;
        handleSession(session);
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      handleSession(data.session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loadingProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
