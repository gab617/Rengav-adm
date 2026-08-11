import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useProfile } from "../../../hooksSB/useProfile";

export function useAdminUsers() {
  const { profile } = useProfile();
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      const currentProfile = profileRef.current;

      if (!currentProfile?.id || (currentProfile.role !== "admin" && currentProfile.role !== "super_admin")) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const isSuperAdmin = currentProfile.role === "super_admin";

      // Super admin ve TODOS los usuarios
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, role, created_at, name, tenant_id, parent_admin_id, slug")
          .order("created_at", { ascending: false });

        if (!mounted) return;

        if (error) {
          setError(error.message);
          setUsers([]);
        } else {
          setUsers(data || []);
        }
        setLoading(false);
        return;
      }

      // Admin normal: solo ve usuarios de su tenant
      if (!currentProfile.tenant_id) {
        setUsers([currentProfile]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, created_at, name, tenant_id, parent_admin_id, slug")
        .eq("tenant_id", currentProfile.tenant_id)
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

    if (profile?.role === "admin" || profile?.role === "super_admin") {
      loadUsers();
    }

    return () => {
      mounted = false;
    };
  }, [profile?.id, profile?.role, profile?.tenant_id]);

  return { users, loading, error };
}
