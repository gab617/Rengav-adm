import { useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import { useProfile } from "../hooksSB/useProfile";

export function useTenant() {
  const { profile } = useProfile();

  const isSuperAdmin = useMemo(() => {
    return profile?.role === "super_admin";
  }, [profile?.role]);

  const isAdmin = useMemo(() => {
    return profile?.role === "admin" || profile?.role === "super_admin";
  }, [profile?.role]);

  const currentTenantId = profile?.tenant_id || null;

  const getTenantUserIds = async () => {
    if (!currentTenantId || !isAdmin) return [];

    // Si es super admin, puede ver todos los usuarios de todos los tenants
    if (isSuperAdmin) {
      const { data } = await supabase
        .from("profiles")
        .select("id");
      return data?.map(p => p.id) || [];
    }

    // Si es admin, ve solo los usuarios de su tenant
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", currentTenantId);

    return data?.map(p => p.id) || [];
  };

  const getTenantUsers = async () => {
    if (!currentTenantId || !isAdmin) return [];

    const { data } = await supabase
      .from("profiles")
      .select("id, name, role, created_at, tenant_id, parent_admin_id")
      .eq("tenant_id", currentTenantId)
      .order("created_at", { ascending: false });

    return data || [];
  };

  const getTenantUserCount = async () => {
    if (!currentTenantId || !isAdmin) return 0;

    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", currentTenantId);

    return count || 0;
  };

  const canCreateUser = () => {
    if (!profile) return false;
    return isAdmin;
  };

  const canCreateTenant = () => {
    return isSuperAdmin;
  };

  const createTenant = async (tenantName) => {
    if (!isSuperAdmin) {
      throw new Error("No tienes permisos para crear tenants");
    }

    const { data, error } = await supabase.rpc("admin_create_tenant", {
      p_name: tenantName,
    });

    if (error) throw error;
    return data;
  };

  return {
    // Estado
    profile,
    currentTenantId,
    isSuperAdmin,
    isAdmin,
    
    // Funciones
    getTenantUserIds,
    getTenantUsers,
    getTenantUserCount,
    canCreateUser,
    canCreateTenant,
    createTenant,
  };
}
