import { useEffect, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useProfile } from "../../../hooksSB/useProfile";
import { useAppContext } from "../../../contexto/Context";

export function useAdminUsers(profile, profileLoading) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, created_at, name")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setUsers([]);
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    }

    // Solo ejecutamos la query si profile ya cargó y es admin
    if (!profileLoading && profile?.role === "admin") {
      loadUsers();
    }

    return () => {
      mounted = false;
    };
  }, [profile, profileLoading]);

  return { users, loading, error };
}
