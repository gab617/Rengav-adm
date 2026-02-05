import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .single();

      if (!error && mounted) {
        setProfile(data);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  return { profile, loadingProfile };
}
