import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../../services/supabaseClient";
import { useAppContext } from "../../../../contexto/Context";

export function AdminDashboard() {
  const { preferencias, profile } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const isSuperAdmin = profile?.role === "super_admin";

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProductsBase: 0,
    totalCategories: 0,
    totalBrands: 0,
    usuariosRecientes: [],
    productosRecientes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!profile?.id || (profile.role !== "admin" && profile.role !== "super_admin")) return;

    async function loadStats() {
      try {
        let userIds = [];

        if (isSuperAdmin) {
          const { data } = await supabase.from("profiles").select("id");
          userIds = data?.map(u => u.id) || [];
        } else if (profile.tenant_id) {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("tenant_id", profile.tenant_id);
          userIds = data?.map(u => u.id) || [];
        }

        if (userIds.length === 0) {
          setStats({
            totalUsers: 0,
            totalProductsBase: 0,
            totalCategories: 0,
            totalBrands: 0,
            usuariosRecientes: [],
            productosRecientes: [],
            loading: false,
            error: null,
          });
          return;
        }

        const countsPromise = Promise.all([
          supabase.from("user_products").select("id", { count: "exact", head: true }).in("user_id", userIds),
          supabase.from("user_categories").select("category_id").in("user_id", userIds),
          supabase.from("user_products").select("base_id").in("user_id", userIds).not("base_id", "is", null),
        ]);

        const [{ count: productsCount }, { data: userCategories }, { data: productsWithBase }] = await countsPromise;
        
        const uniqueCategories = new Set(userCategories?.map(c => c.category_id).filter(c => c !== null) || []);
        
        const baseIds = productsWithBase?.map(p => p.base_id).filter(b => b !== null) || [];
        let uniqueBrands = 0;
        
        if (baseIds.length > 0) {
          const { data: basesWithBrands } = await supabase
            .from("products_base")
            .select("brand_id")
            .in("id", baseIds);
          
          uniqueBrands = new Set(basesWithBrands?.map(b => b.brand_id).filter(b => b !== null) || []).size;
        }

        let queryRecientes;
        if (isSuperAdmin) {
          queryRecientes = supabase.from("profiles").select("id, name, role, created_at").order("created_at", { ascending: false }).limit(5);
        } else {
          queryRecientes = supabase.from("profiles").select("id, name, role, created_at").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false }).limit(5);
        }

        let recientesUsers = [];
        if (isSuperAdmin) {
          const { data } = await queryRecientes;
          recientesUsers = data || [];
        } else {
          const { data } = await queryRecientes;
          const adminInList = data?.find(u => u.id === profile.id);
          recientesUsers = adminInList ? data : [{ id: profile.id, name: profile.name || "Mi cuenta", role: profile.role, created_at: profile.created_at }, ...(data || [])];
        }

        setStats({
          totalUsers: userIds.length,
          totalProductsBase: productsCount || 0,
          totalCategories: uniqueCategories.size,
          totalBrands: uniqueBrands,
          usuariosRecientes: recientesUsers.slice(0, 5),
          productosRecientes: [],
          loading: false,
          error: null,
        });
      } catch (err) {
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      }
    }

    loadStats();
  }, [profile, isSuperAdmin]);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";

  if (stats.loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <span className="text-lg animate-pulse">Cargando dashboard...</span>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className={`p-4 rounded-xl border ${dark ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
        Error: {stats.error}
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>
          Dashboard
        </h1>
        <span className={`text-sm ${textSecondary}`}>
          Resumen del sistema
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard dark={dark} icon="👥" label="Usuarios" value={stats.totalUsers} color="blue" />
        <MetricCard dark={dark} icon="📦" label="Productos" value={stats.totalProductsBase} color="green" />
        <MetricCard dark={dark} icon="🏷️" label="Categorías" value={stats.totalCategories} color="purple" />
        <MetricCard dark={dark} icon="🏪" label="Marcas" value={stats.totalBrands} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className={`rounded-xl border p-4 ${bgCard}`}>
          <h2 className={`font-bold text-base md:text-lg mb-4 flex items-center gap-2 ${textPrimary}`}>
            👥 Últimos usuarios
          </h2>
          {stats.usuariosRecientes.length > 0 ? (
            <ul className="space-y-2 md:space-y-3">
              {stats.usuariosRecientes.map((user) => (
                <li
                  key={user.id}
                  className={`flex items-center justify-between p-2 md:p-3 rounded-lg ${dark ? "bg-gray-700/50" : "bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-base md:text-lg shrink-0
                      ${user.role === "admin" ? "bg-red-500/20" : "bg-blue-500/20"}`}>
                      {user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm md:text-base truncate ${textPrimary}`}>
                        {user.name || "Sin nombre"}
                      </p>
                      <span className={`text-xs ${textSecondary}`}>
                        {user.role === "admin" ? "Admin" : "Usuario"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs md:text-sm shrink-0 ml-2 ${textSecondary}`}>
                    {formatDate(user.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-center py-6 md:py-8 ${textSecondary}`}>
              No hay usuarios registrados
            </p>
          )}
          <Link
            to="/admin/users"
            className="block mt-4 text-center text-sm text-blue-500 hover:text-blue-400"
          >
            Ver todos los usuarios →
          </Link>
        </div>

        <div className={`rounded-xl border p-4 ${bgCard}`}>
          <h2 className={`font-bold text-base md:text-lg mb-4 flex items-center gap-2 ${textPrimary}`}>
            📦 Últimos productos
          </h2>
          {stats.productosRecientes.length > 0 ? (
            <ul className="space-y-2 md:space-y-3">
              {stats.productosRecientes.map((prod) => (
                <li
                  key={prod.id}
                  className={`flex items-center justify-between p-2 md:p-3 rounded-lg ${dark ? "bg-gray-700/50" : "bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-base md:text-lg shrink-0
                      ${dark ? "bg-green-500/20" : "bg-green-100"}`}>
                      📦
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm md:text-base truncate ${textPrimary}`}>
                        {prod.name}
                      </p>
                      <span className={`text-xs ${textSecondary}`}>
                        {prod.categories?.name || "Sin categoría"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs md:text-sm shrink-0 ml-2 ${textSecondary}`}>
                    {formatDate(prod.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-center py-6 md:py-8 ${textSecondary}`}>
              No hay productos registrados
            </p>
          )}
          <Link
            to="/admin/prods-base"
            className="block mt-4 text-center text-sm text-blue-500 hover:text-blue-400"
          >
            Ver todos los productos →
          </Link>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h2 className={`font-bold text-base md:text-lg mb-4 ${textPrimary}`}>
          ⚡ Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <QuickAction dark={dark} icon="👥" label="Usuarios" to="/admin/users" color="blue" />
          <QuickAction dark={dark} icon="📦" label="Productos" to="/admin/prods-base" color="green" />
          <QuickAction dark={dark} icon="🔗" label="Asignar" to="/admin/assign" color="purple" />
          <QuickAction dark={dark} icon="➕" label="Nuevo" to="/admin/prods-base" color="yellow" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ dark, icon, label, value, color }) {
  const colors = {
    blue: dark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200",
    green: dark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200",
    purple: dark ? "bg-purple-900/30 border-purple-700" : "bg-purple-50 border-purple-200",
    yellow: dark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200",
  };
  const textSecondaryColor = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`p-3 md:p-4 rounded-xl border-2 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1 md:mb-2">
        <span className="text-xl md:text-2xl">{icon}</span>
        <span className={`text-xs md:text-sm ${textSecondaryColor}`}>{label}</span>
      </div>
      <span className={`text-2xl md:text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

function QuickAction({ dark, icon, label, to, color }) {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-500",
    green: "bg-green-600 hover:bg-green-500",
    purple: "bg-purple-600 hover:bg-purple-500",
    yellow: "bg-yellow-500 hover:bg-yellow-400 text-black",
  };

  return (
    <Link
      to={to}
      className={`p-3 md:p-4 rounded-xl text-center text-white font-medium transition-all hover:scale-105 ${colors[color]}`}
    >
      <span className="text-2xl md:text-3xl block mb-1">{icon}</span>
      <span className="text-xs md:text-sm">{label}</span>
    </Link>
  );
}
