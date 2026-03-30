import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import { supabase } from "../../../services/supabaseClient";

function shortId(id) {
  return id.slice(0, 8) + "…";
}

function StatCard({ icon, label, value, color = "blue" }) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  
  const colors = {
    blue: dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600",
    green: dark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600",
    red: dark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600",
    yellow: dark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-50 text-yellow-600",
    purple: dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-50 text-purple-600",
  };

  return (
    <div className={`p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-white"} border ${dark ? "border-gray-700" : "border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
      </div>
      <span className={`text-xl font-bold ${colors[color].split(" ")[1]}`}>{value}</span>
    </div>
  );
}

function UserExpandedDetail({ user }) {
  const { preferencias, profile } = useAppContext();
  const dark = preferencias?.theme === "dark";
  
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("resumen");
  const [expandedSale, setExpandedSale] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [allUsers, setAllUsers] = useState({});
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [deactivating, setDeactivating] = useState(false);
  const [productFilter, setProductFilter] = useState("all");

  const loadUserData = async () => {
    const targetUserId = user?.id;
    if (!targetUserId) {
      setProducts([]);
      setSales([]);
      setSelectedProducts(new Set());
      return;
    }

    setLoading(true);
    setSelectedProducts(new Set());

    const [productsRes, salesRes] = await Promise.all([
      supabase
        .from("user_products")
        .select(`
          id, active, precio_compra, precio_venta, stock, user_id, base_id,
          products_base (id, name, brands(name)),
          user_custom_products (id, name)
        `)
        .eq("user_id", targetUserId),
      supabase
        .from("user_sales")
        .select("*")
        .eq("user_id", targetUserId)
        .order("fecha", { ascending: false })
        .limit(200)
    ]);

    if (user?.id !== targetUserId) return;

    const filteredProducts = (productsRes.data || []).filter(p => p.products_base);
    setProducts(filteredProducts);
    setSales(salesRes.data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    loadUserData();
  }, [user?.id, profile?.id]);

  const getDateFilter = () => {
    const now = new Date();
    let startDate;
    
    switch (dateFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "all":
      default:
        return null;
    }
    
    return startDate;
  };

  const filteredSales = useMemo(() => {
    const startDate = getDateFilter();
    if (!startDate) return sales;
    return sales.filter(v => new Date(v.fecha) >= startDate);
  }, [sales, dateFilter]);

  const isOwnProfile = profile?.id === user.id;
  const canViewAll = profile?.role === "admin";
  const viewingAllData = canViewAll && !isOwnProfile;

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAllProducts = () => {
    if (viewingAllData) {
      alert("⚠️ Estás viendo datos de múltiples usuarios. Seleccioná productos manualmente para evitar desactivar productos de otros usuarios.");
      return;
    }
    const activos = products.filter(p => p.active !== false).map(p => p.id);
    setSelectedProducts(new Set(activos));
  };

  const deselectAllProducts = () => {
    setSelectedProducts(new Set());
  };

  const deactivateSelected = async () => {
    if (selectedProducts.size === 0 || !user?.id) return;

    const idsToDeactivate = Array.from(selectedProducts);
    const currentUserId = user.id;

    if (!confirm(`¿Desactivar ${idsToDeactivate.length} productos?`)) return;

    setDeactivating(true);
    try {
      const updates = idsToDeactivate.map(id =>
        supabase
          .from("user_products")
          .update({ active: false, stock: 0 })
          .eq("id", id)
      );
      await Promise.all(updates);

      await loadUserData();
    } catch (err) {
      console.error(err);
      alert("Error al desactivar productos");
    } finally {
      setDeactivating(false);
    }
  };

  const reactivateProduct = async (productId) => {
    try {
      await supabase
        .from("user_products")
        .update({ active: true })
        .eq("id", productId);

      await loadUserData();
    } catch (err) {
      console.error(err);
      alert("Error al reactivar producto");
    }
  };

  const stats = {
    productosActivos: products.filter(p => p.active !== false).length,
    productosInactivos: products.filter(p => p.active === false).length,
    stockTotal: products.reduce((acc, p) => acc + (p.stock || 0), 0),
    productosSinStock: products.filter(p => p.stock <= 0).length,
    ventasTotales: filteredSales.length,
    montoTotal: filteredSales.reduce((acc, v) => acc + (v.monto_total || 0), 0),
    ticketsPromedio: filteredSales.length > 0 ? (filteredSales.reduce((acc, v) => acc + (v.monto_total || 0), 0) / filteredSales.length) : 0,
    usuarios: viewingAllData ? new Set(sales.map(s => s.user_id)).size : 1,
  };

  const filteredProducts = useMemo(() => {
    if (productFilter === "active") {
      return products.filter(p => p.active !== false);
    }
    if (productFilter === "inactive") {
      return products.filter(p => p.active === false);
    }
    return products;
  }, [products, productFilter]);

  const filterLabels = {
    today: "Hoy",
    week: "7 días",
    month: "Este mes",
    all: "Todo"
  };

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";

  if (loading) {
    return (
      <div className={`p-6 text-center ${textSecondary}`}>
        <span className="animate-pulse">Cargando datos del usuario...</span>
      </div>
    );
  }

  return (
    <div className={`p-3 md:p-4 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"} border ${dark ? "border-blue-700" : "border-blue-300"} pb-20 md:pb-0`}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
            user.role === "admin" ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
          }`}>
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <h3 className={`font-bold text-lg ${textPrimary}`}>{user.name}</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                user.role === "admin" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
              }`}>
                {user.role}
              </span>
              {viewingAllData && (
                <span className={`px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400`}>
                  👁️ Admin
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpandedUser(null)}
          className={`p-2 rounded-lg ${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
        >
          <span className="text-xl">✕</span>
        </button>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <StatCard icon="📦" label="Activos" value={stats.productosActivos} color="green" />
        <StatCard icon="📋" label="Inactivos" value={stats.productosInactivos} color="red" />
        <StatCard icon="🏪" label="Stock" value={stats.stockTotal} color="blue" />
        <StatCard icon="⚠️" label="Sin stock" value={stats.productosSinStock} color="yellow" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <StatCard icon="🧾" label="Ventas" value={stats.ventasTotales} color="purple" />
        <StatCard icon="💰" label="Total" value={`$${stats.montoTotal.toLocaleString()}`} color="green" />
        <StatCard icon="📊" label="Ticket" value={`$${Math.round(stats.ticketsPromedio).toLocaleString()}`} color="purple" />
        <StatCard icon={viewingAllData ? "👥" : "📅"} label={viewingAllData ? "Users" : filterLabels[dateFilter]} value={viewingAllData ? stats.usuarios : stats.ventasTotales} color="blue" />
      </div>

      {/* SECTION TABS */}
      <div className={`flex gap-1 p-1 rounded-xl mb-4 ${dark ? "bg-gray-900" : "bg-white"}`}>
        {[
          { id: "resumen", icon: "📈", label: "Resumen" },
          { id: "productos", icon: "📦", label: `Prod (${products.length})` },
          { id: "ventas", icon: "🧾", label: `Ventas (${sales.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSection(tab.id);
              setSelectedProducts(new Set());
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              activeSection === tab.id
                ? "bg-blue-500 text-white"
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {activeSection === "resumen" && (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl ${bgCard}`}>
            <h4 className={`font-semibold mb-2 ${textPrimary}`}>Información del usuario</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className={textSecondary}>Registrado:</span>
                <span className={`ml-2 ${textPrimary}`}>
                  {new Date(user.created_at).toLocaleDateString("es-AR")}
                </span>
              </div>
              <div>
                <span className={textSecondary}>Última venta:</span>
                <span className={`ml-2 ${textPrimary}`}>
                  {sales[0] ? new Date(sales[0].fecha).toLocaleDateString("es-AR") : "Sin ventas"}
                </span>
              </div>
            </div>
          </div>

          {stats.productosSinStock > 0 && (
            <div className={`p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30`}>
              <p className="text-yellow-500 text-sm">
                ⚠️ {stats.productosSinStock} productos sin stock necesitan reposición
              </p>
            </div>
          )}

          {products.filter(p => p.active === false).length > 0 && (
            <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/30`}>
              <p className="text-red-500 text-sm">
                🔴 {products.filter(p => p.active === false).length} productos inactivos
              </p>
            </div>
          )}
        </div>
      )}

      {activeSection === "productos" && (
        <div className="space-y-3">
          {/* TOOLBAR */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className={`flex gap-1 p-1 rounded-lg ${dark ? "bg-gray-900" : "bg-gray-100"}`}>
              {[
                { id: "all", label: `Todos (${products.length})` },
                { id: "active", label: `Activos (${stats.productosActivos})` },
                { id: "inactive", label: `Inactivos (${stats.productosInactivos})` },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setProductFilter(filter.id)}
                  className={`py-1 px-3 rounded text-xs font-medium transition-all ${
                    productFilter === filter.id
                      ? "bg-blue-500 text-white"
                      : `${textSecondary} hover:${textPrimary}`
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {productFilter === "active" && stats.productosActivos > 0 && (
              <div className="flex gap-1">
                {viewingAllData && (
                  <span className="py-1 px-2 rounded text-xs bg-yellow-500/20 text-yellow-400 animate-pulse">
                    ⚠️ Admin
                  </span>
                )}
                <button
                  onClick={selectAllProducts}
                  className={`py-1 px-3 rounded text-xs font-medium ${viewingAllData ? "bg-gray-500/20 text-gray-400 cursor-not-allowed" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"}`}
                  disabled={viewingAllData}
                >
                  Seleccionar todos
                </button>
                <button
                  onClick={deselectAllProducts}
                  className={`py-1 px-3 rounded text-xs font-medium ${dark ? "bg-gray-700" : "bg-gray-200"} ${textSecondary}`}
                >
                  Ninguno
                </button>
              </div>
            )}
          </div>

          {/* LIST */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className={`text-center py-4 ${textSecondary}`}>
                {productFilter === "inactive" ? "Sin productos inactivos" : "Sin productos asignados"}
              </p>
            ) : (
              filteredProducts.map(p => {
                const isBase = !!p.products_base;
                const name = isBase ? p.products_base?.name : p.user_custom_products?.name;
                const brand = p.products_base?.brands?.name;
                const isSelected = selectedProducts.has(p.id);
                const isInactive = p.active === false;

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                      isInactive
                        ? `${dark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`
                        : isSelected
                          ? `${bgCard} border-red-500 ring-2 ring-red-500/50`
                          : `${bgCard} hover:border-blue-400 cursor-pointer`
                    }`}
                    onClick={() => !isInactive && toggleProductSelection(p.id)}
                  >
                    {productFilter === "active" && !isInactive && (
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-red-500 bg-red-500" : "border-gray-400"
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${isInactive ? "line-through opacity-60" : ""} ${textPrimary}`}>
                          {name || "Sin nombre"}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${
                          isInactive
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          {isInactive ? "Inactivo" : "Activo"}
                        </span>
                      </div>
                      <p className={`text-xs ${isInactive ? "opacity-60" : ""} ${textSecondary}`}>
                        {brand || "Sin marca"} · Stock: {p.stock || 0}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-bold ${isInactive ? "opacity-60" : ""} ${textPrimary}`}>${p.precio_venta || 0}</p>
                      {isInactive ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            reactivateProduct(p.id);
                          }}
                          className="text-xs text-green-400 hover:text-green-300 mt-1"
                        >
                          ⟳ Reactivar
                        </button>
                      ) : (
                        <p className={`text-xs ${textSecondary}`}>compra: ${p.precio_compra || 0}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* BULK ACTIONS */}
          {selectedProducts.size > 0 && (
            <div className={`fixed bottom-16 md:bottom-0 left-0 right-0 p-3 md:p-4 ${dark ? "bg-gray-900 border-t border-gray-800" : "bg-white border-t border-gray-200"} shadow-2xl z-40`}>
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className={`font-bold text-base md:text-lg text-red-500`}>
                    {selectedProducts.size} seleccionados
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={deselectAllProducts}
                    className={`px-3 md:px-4 py-2 rounded-xl border ${dark ? "border-gray-700" : "border-gray-300"} ${textSecondary} text-sm`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deactivateSelected}
                    disabled={deactivating}
                    className="px-4 md:px-6 py-2 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-red-600 transition-colors text-sm"
                  >
                    {deactivating ? (
                      <><span className="animate-spin">⟳</span> Desact...</>
                    ) : (
                      <>🚫 Desactivar {selectedProducts.size}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "ventas" && (
        <div className="space-y-3">
          {/* DATE FILTER */}
          <div className={`flex gap-2 p-1 rounded-xl ${dark ? "bg-gray-900" : "bg-white"}`}>
            {Object.entries(filterLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  dateFilter === key
                    ? "bg-blue-500 text-white"
                    : `${textSecondary} hover:${textPrimary}`
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* STATS FOR PERIOD */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-3 rounded-lg ${bgCard} text-center`}>
              <p className={`text-2xl font-bold text-green-500`}>{filteredSales.length}</p>
              <p className={`text-xs ${textSecondary}`}>Ventas</p>
            </div>
            <div className={`p-3 rounded-lg ${bgCard} text-center`}>
              <p className={`text-2xl font-bold ${textPrimary}`}>${stats.montoTotal.toLocaleString()}</p>
              <p className={`text-xs ${textSecondary}`}>Total</p>
            </div>
          </div>

          {/* SALES LIST */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredSales.length === 0 ? (
              <p className={`text-center py-4 ${textSecondary}`}>Sin ventas en este período</p>
            ) : (
              filteredSales.slice(0, 50).map(sale => (
                <div
                  key={sale.id}
                  className={`p-3 rounded-lg ${bgCard}`}
                >
                  <div
                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      {viewingAllData && (
                        <p className={`text-xs font-medium text-blue-400 mb-1`}>
                          👤 {allUsers[sale.user_id] || shortId(sale.user_id)}
                        </p>
                      )}
                      <p className={`font-medium ${textPrimary}`}>
                        {new Date(sale.fecha).toLocaleString("es-AR")}
                      </p>
                      <p className={`text-xs ${textSecondary}`}>
                        {sale.user_sales_detail?.length || 0} productos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-green-500`}>${sale.monto_total?.toLocaleString()}</p>
                      <p className={`text-xs ${textSecondary}`}>
                        {expandedSale === sale.id ? "▼" : "▶"}
                      </p>
                    </div>
                  </div>

                  {expandedSale === sale.id && sale.user_sales_detail && (
                    <div className={`mt-3 pt-3 border-t ${dark ? "border-gray-700" : "border-gray-200"}`}>
                      {sale.user_sales_detail.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1">
                          <span className={textSecondary}>
                            {item.nombre_producto || "Producto"} x{item.cantidad}
                          </span>
                          <span className={textPrimary}>
                            ${((item.precio_unitario || 0) * (item.cantidad || 1)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {filteredSales.length > 50 && (
            <p className={`text-center text-xs ${textSecondary} py-2`}>
              Mostrando 50 de {filteredSales.length} ventas
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Users() {
  const { profile, preferencias } = useAppContext();
  const { users, loading, refreshUsers } = useAdminUsers(profile);
  const [expandedUser, setExpandedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const dark = preferencias?.theme === "dark";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setCreating(true);

    try {
      if (!newUser.email || !newUser.password || !newUser.name) {
        throw new Error("Todos los campos son requeridos");
      }

      if (newUser.password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            name: newUser.name,
            role: newUser.role,
          });

        if (profileError) throw profileError;

        setNewUser({ name: "", email: "", password: "", role: "user" });
        setCreateSuccess("¡Usuario creado exitosamente!");
        setShowAddForm(false);
        
        await refreshUsers();
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!profile || profile.role !== "admin") {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes acceso
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-6 text-center ${textSecondary}`}>
        <span className="animate-pulse">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 space-y-4 ${dark ? "bg-gray-900" : "bg-gray-50"} min-h-screen pb-20 md:pb-0`}>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className={`text-lg md:text-2xl font-bold ${textPrimary}`}>
          👥 Usuarios
        </h1>
        <div className="flex items-center gap-2">
          <span className={`text-xs md:text-sm ${textSecondary}`}>
            {users.length} usuarios
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all flex items-center gap-1 ${
              showAddForm
                ? dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            {showAddForm ? "✕" : "+"} Agregar
          </button>
        </div>
      </div>

      {/* ADD USER FORM */}
      {showAddForm && (
        <form onSubmit={handleCreateUser} className={`p-4 rounded-xl border ${bgCard} space-y-3`}>
          <h3 className={`font-semibold ${textPrimary}`}>Crear nuevo usuario</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nombre completo"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
              required
            />
            <input
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
              required
              minLength={6}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {createError && (
            <p className="text-red-500 text-sm">{createError}</p>
          )}
          {createSuccess && (
            <p className="text-green-500 text-sm">{createSuccess}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creando..." : "Crear usuario"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setCreateError("");
                setCreateSuccess("");
                setNewUser({ name: "", email: "", password: "", role: "user" });
              }}
              className={`px-4 py-2.5 rounded-lg border ${dark ? "border-gray-600 text-gray-400" : "border-gray-300 text-gray-600"}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Buscar usuario..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={`w-full p-2.5 md:p-3 rounded-xl border ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200"} ${textPrimary}`}
      />

      {/* USERS LIST */}
      <div className="space-y-3 pb-20 md:pb-0">
        {filteredUsers.map(u => (
          <div key={u.id} className={`rounded-xl border ${bgCard} overflow-hidden`}>
            {/* USER ROW */}
            <div
              className="p-3 md:p-4 flex items-center justify-between cursor-pointer hover:bg-opacity-50 transition"
              onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  u.role === "admin"
                    ? "bg-red-500/20 text-red-500"
                    : "bg-blue-500/20 text-blue-500"
                }`}>
                  {u.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>{u.name}</p>
                  <p className={`text-xs ${textSecondary}`}>
                    {shortId(u.id)} · {new Date(u.created_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  u.role === "admin"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}>
                  {u.role}
                </span>
                <span className={`text-2xl ${textSecondary} transition-transform ${expandedUser === u.id ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </div>
            </div>

            {/* EXPANDED DETAIL */}
            {expandedUser === u.id && (
              <div className={`border-t ${dark ? "border-gray-700" : "border-gray-200"}`}>
                <UserExpandedDetail key={u.id} user={u} />
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className={`text-center py-12 ${textSecondary}`}>
          <div className="text-5xl mb-4">🔍</div>
          <p>No se encontraron usuarios</p>
        </div>
      )}
    </div>
  );
}

function useAdminUsers(profile) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function loadUsers() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, name, role, created_at")
        .order("created_at", { ascending: false });
      setUsers(data || []);
      setLoading(false);
    }

    loadUsers();
  }, [profile]);

  const refreshUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role, created_at")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  return { users, loading, refreshUsers };
}
