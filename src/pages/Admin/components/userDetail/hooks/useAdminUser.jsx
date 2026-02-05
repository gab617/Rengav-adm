import { useEffect, useState } from "react";
import { supabase } from "../../../../../services/supabaseClient";

export function useAdminUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, created_at, name")
        .eq("id", userId)
        .single();

      if (!mounted) return;

      setUser(error ? null : data);
      setLoading(false);
    }

    if (userId) loadUser();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { user, loading };
}
