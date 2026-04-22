import { useEffect, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useProfile } from "../../../hooksSB/useProfile";
import { useAppContext } from "../../../contexto/Context";

export function useAdminUsers() {
  const { profile } = useProfile();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      if (!profile?.id || profile.role !== "admin") {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, created_at, name, parent_admin_id")
        .or(`parent_admin_id.eq.${profile.id},id.eq.${profile.id}`)
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

    if (profile?.role === "admin") {
      loadUsers();
    }

    return () => {
      mounted = false;
    };
  }, [profile]);

  return { users, loading, error };
}
