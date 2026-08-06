import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../../contexto/Context";
import { useTenant } from "../../../hooks/useTenant";
import { supabase } from "../../../services/supabaseClient";

export function Tenants() {
  const { profile, preferencias } = useAppContext();
  const { createTenant } = useTenant();
  const dark = preferencias?.theme === "dark";
  const isSuperAdmin = profile?.role === "super_admin";

  const [tenants, setTenants] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("id", { ascending: false });

      if (tenantsError) throw tenantsError;

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("tenant_id");

      const countMap = {};
      profilesData?.forEach((p) => {
        if (p.tenant_id == null) return;
        countMap[p.tenant_id] = (countMap[p.tenant_id] || 0) + 1;
      });

      setTenants(tenantsData || []);
      setCounts(countMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    loadTenants();
  }, [isSuperAdmin, loadTenants]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    if (!tenantName.trim()) {
      setCreateError("El nombre del negocio es obligatorio");
      return;
    }
    setCreating(true);
    try {
      await createTenant(tenantName.trim());
      setCreateSuccess("¡Negocio creado exitosamente!");
      setTenantName("");
      loadTenants();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes acceso
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>🏪 Negocios</h1>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white">
          Super Admin
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className={`p-4 rounded-xl border ${bgCard} space-y-3`}
      >
        <div>
          <h2 className={`font-semibold ${textPrimary}`}>Crear nuevo negocio</h2>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            Se crea un tenant nuevo. Solo el super admin puede hacer esto.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Nombre del negocio"
            className={`flex-1 px-4 py-2 rounded-lg border outline-none ${inputBg}`}
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {creating ? "Creando..." : "Crear negocio"}
          </button>
        </div>
        {createError && <p className="text-red-500 text-sm">{createError}</p>}
        {createSuccess && <p className="text-green-600 text-sm">{createSuccess}</p>}
      </form>

      <div className="space-y-3">
        <h2 className={`text-lg font-semibold ${textPrimary}`}>
          Listado ({tenants.length})
        </h2>

        {loading && <p className={textSecondary}>Cargando...</p>}

        {!loading && tenants.length === 0 && (
          <div className={`p-6 rounded-xl border ${bgCard} text-center ${textSecondary}`}>
            No hay negocios todavía
          </div>
        )}

        {!loading &&
          tenants.map((tenant) => (
            <div
              key={tenant.id}
              className={`p-4 rounded-xl border ${bgCard} flex items-center justify-between gap-4`}
            >
              <div className="min-w-0">
                <h3 className={`font-semibold truncate ${textPrimary}`}>{tenant.name}</h3>
                <p className={`text-xs mt-1 ${textSecondary}`}>
                  {counts[tenant.id] || 0} usuarios
                  {tenant.created_at && ` · Creado el ${new Date(tenant.created_at).toLocaleDateString("es-AR")}`}
                </p>
              </div>
              <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-gray-500 text-white">
                ID {tenant.id}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
