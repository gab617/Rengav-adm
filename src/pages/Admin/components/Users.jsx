import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import { supabase } from "../../../services/supabaseClient";
import { useAdminData } from "../../../hooks/useAdminData";
import { useAdminUsers } from "../hooksAdmin/useAdminUsers"
import { SucursalSettings } from "./userDetail/tabs/configuracion/SucursalSettings";

function useAdminCategories() {
  const { systemCategories, isLoaded, loadInitialData } = useAdminData();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      loadInitialData().then(() => {
        setCategorias(systemCategories);
        setLoading(false);
      });
    } else {
      setCategorias(systemCategories);
      setLoading(false);
    }
  }, [isLoaded, systemCategories]);

  return { categorias, loading };
}

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

function UserExpandedDetail({ user, onClose, invalidateUserCategories }) {
  const { preferencias, profile } = useAppContext();
  const dark = preferencias?.theme === "dark";
  
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("resumen");
  const [expandedSale, setExpandedSale] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [deactivating, setDeactivating] = useState(false);
  const [updatingProducts, setUpdatingProducts] = useState(false);
  const [productFilter, setProductFilter] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubcategory, setFilterSubcategory] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  
  // Categorías - separadas para tab vs filtros de productos
  const [systemCategoriesForTab, setSystemCategoriesForTab] = useState([]); // Para tab de categorías (todas)
  const [filterCategories, setFilterCategories] = useState([]); // Para filtros de productos
  const [userCategorias, setUserCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [allUsers, setAllUsers] = useState({});
  const [subcategories, setSubcategories] = useState([]);
  const [allSubcategoriesCache, setAllSubcategoriesCache] = useState([]); // Cache de todas las subcategorías
  const [productCategoriesUsed, setProductCategoriesUsed] = useState([]); // Para filtros de productos
  const [productSubcategoriesUsed, setProductSubcategoriesUsed] = useState([]);

  // Cargar todas las subcategorías una sola vez al montar
  useEffect(() => {
    async function loadAllSubcategories() {
      const { data } = await supabase
        .from("subcategories")
        .select("id, name, category_id")
        .order("name");
      setAllSubcategoriesCache(data || []);
    }
    loadAllSubcategories();
  }, []);

  // Cargar subcategorías desde cache cuando se selecciona una categoría
  useEffect(() => {
    if (filterCategory === "all") {
      setSubcategories([]);
      return;
    }
    // Filtrar solo las subcategorías que el usuario tiene en sus productos
    const subsToFilter = productSubcategoriesUsed.length > 0 ? productSubcategoriesUsed : null;
    let filtered = allSubcategoriesCache.filter(s => String(s.category_id) === String(filterCategory));
    if (subsToFilter) {
      filtered = filtered.filter(s => subsToFilter.includes(s.id));
    }
    setSubcategories(filtered);
  }, [filterCategory, productSubcategoriesUsed, allSubcategoriesCache]);

  // Extraer categorías y subcategorías únicas de los productos del usuario (para filtros)
  useEffect(() => {
    const cats = new Set();
    const subs = new Set();
    products.forEach(p => {
      if (p.products_base?.category_id) {
        cats.add(p.products_base.category_id);
      }
      if (p.products_base?.subcategory_id) {
        subs.add(p.products_base.subcategory_id);
      }
    });
    setProductCategoriesUsed(Array.from(cats));
    setProductSubcategoriesUsed(Array.from(subs));
  }, [products]);

  // Cargar categorías del sistema filtradas solo por las que usa este usuario (para filtros de productos)
  useEffect(() => {
    async function loadUserCategories() {
      const { data } = await supabase
        .from("categories")
        .select("id, name, color")
        .in("id", productCategoriesUsed.length > 0 ? productCategoriesUsed : ["none"])
        .order("name");
      setFilterCategories(data || []);
    }
    if (productCategoriesUsed.length > 0) {
      loadUserCategories();
    } else {
      setFilterCategories([]);
    }
  }, [productCategoriesUsed]);

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
          products_base (id, name, brands(name), type_unit, category_id, subcategory_id, categories(name), subcategories(name)),
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

    const filteredProducts = (productsRes.data || []); // Including both base and custom products
    setProducts(filteredProducts);
    setSales(salesRes.data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    loadUserData();
  }, [user?.id, profile?.id]);

  // Cargar categorías disponibles y del usuario (para el tab de categorías - TODAS)
  const loadCategorias = async () => {
    const [catsRes, userCatsRes] = await Promise.all([
      supabase.from("categories").select("id, name, color, subcategories(id, name)").order("name"),
      supabase.from("user_categories").select("category_id").eq("user_id", user?.id)
    ]);
    
    setSystemCategoriesForTab(catsRes.data || []);
    setUserCategorias(userCatsRes.data?.map(uc => uc.category_id) || []);
  };

  useEffect(() => {
    if (user?.id) loadCategorias();
  }, [user?.id]);

  const toggleCategoria = async (catId) => {
    if (!user?.id) return;
    
    setLoadingCategorias(true);
    const tieneCategoria = userCategorias.includes(catId);
    
    try {
      if (tieneCategoria) {
        // Quitar categoría
        await supabase
          .from("user_categories")
          .delete()
          .eq("user_id", user.id)
          .eq("category_id", catId);
      } else {
        // Agregar categoría
        await supabase
          .from("user_categories")
          .insert({ user_id: user.id, category_id: catId, active: true });
      }
      
      await loadCategorias();
      await invalidateUserCategories(user.id);
    } catch (err) {
      console.error("Error toggling categoria:", err);
    } finally {
      setLoadingCategorias(false);
    }
  };

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
  const canViewAll = profile?.role === "admin" || profile?.role === "super_admin";
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

      // Actualizar estado local sin recargar todo
      setProducts(prev => prev.map(p => 
        selectedProducts.has(p.id) 
          ? { ...p, active: false, stock: 0 }
          : p
      ));
      setSelectedProducts(new Set());
    } catch (err) {
      console.error(err);
      alert("Error al desactivar productos");
    } finally {
      setDeactivating(false);
    }
  };

  const reactivateProduct = async (productId) => {
    setUpdatingProducts(true);
    try {
      await supabase
        .from("user_products")
        .update({ active: true })
        .eq("id", productId);

      // Actualizar estado local sin recargar todo
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, active: true }
          : p
      ));
    } catch (err) {
      console.error(err);
      alert("Error al reactivar producto");
    } finally {
      setUpdatingProducts(false);
    }
  };

  const stats = {
    productosActivos: products.filter(p => p.active !== false).length,
    productosInactivos: products.filter(p => p.active === false).length,
    productosBase: products.filter(p => p.products_base).length,
    productosCustom: products.filter(p => p.user_custom_products).length,
    stockTotal: products.reduce((acc, p) => acc + (p.stock || 0), 0),
    productosSinStock: products.filter(p => p.stock <= 0).length,
    ventasTotales: filteredSales.length,
    montoTotal: filteredSales.reduce((acc, v) => acc + (v.monto_total || 0), 0),
    ticketsPromedio: filteredSales.length > 0 ? (filteredSales.reduce((acc, v) => acc + (v.monto_total || 0), 0) / filteredSales.length) : 0,
    usuarios: viewingAllData ? new Set(sales.map(s => s.user_id)).size : 1,
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    
    if (productFilter === "active") {
      result = result.filter(p => p.active !== false);
    } else if (productFilter === "inactive") {
      result = result.filter(p => p.active === false);
    } else if (productFilter === "custom") {
      result = result.filter(p => p.user_custom_products);
    }
    
    if (filterCategory !== "all") {
      result = result.filter(p => p.products_base && String(p.products_base.category_id) === String(filterCategory));
    }
    
    if (filterSubcategory !== "all") {
      result = result.filter(p => p.products_base && String(p.products_base.subcategory_id) === String(filterSubcategory));
    }
    
    if (filterTipo === "weight") {
      result = result.filter(p => p.products_base?.type_unit === "weight");
    } else if (filterTipo === "unit") {
      result = result.filter(p => p.products_base?.type_unit === "unit");
    }
    
    return result;
  }, [products, productFilter, filterCategory, filterSubcategory, filterTipo]);

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
    <div className={`p-2 sm:p-3 md:p-4 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"} border ${dark ? "border-blue-700" : "border-blue-300"} pb-20 md:pb-0`}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-10 h-10 sm:w-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold ${
            user.role === "admin" ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
          }`}>
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <h3 className={`font-bold text-base sm:text-lg ${textPrimary}`}>{user.name}</h3>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
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
          onClick={onClose}
          className={`p-2 rounded-lg ${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
        >
          <span className="text-xl">✕</span>
        </button>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <StatCard icon="📦" label="Activos" value={stats.productosActivos} color="green" />
        <StatCard icon="🏭" label="Base" value={stats.productosBase} color="blue" />
        <StatCard icon="✨" label="Custom" value={stats.productosCustom} color="purple" />
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
          { id: "categorias", icon: "📁", label: `Cats (${userCategorias.length})` },
          { id: "configuracion", icon: "🎨", label: "Tienda" },
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

          {/* Categorías del usuario en resumen */}
          {userCategorias.length > 0 && (
            <div className={`p-4 rounded-xl ${bgCard}`}>
              <h4 className={`font-semibold mb-2 ${textPrimary}`}>Categorías asignadas ({userCategorias.length})</h4>
              <div className="flex flex-wrap gap-2">
                {userCategorias.map(catId => {
                  const cat = systemCategoriesForTab.find(c => c.id === catId);
                  return cat ? (
                    <span key={catId} className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                      {cat.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

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

      {activeSection === "categorias" && (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl ${bgCard}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-semibold ${textPrimary}`}>Categorías del usuario</h4>
              <span className={`text-xs ${textSecondary}`}>
                {userCategorias.length} de {systemCategoriesForTab.length}
              </span>
            </div>
            
            {systemCategoriesForTab.length === 0 ? (
              <p className={`text-sm ${textSecondary}`}>No hay categorías disponibles</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {systemCategoriesForTab.map(cat => {
                  const tieneCat = userCategorias.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategoria(cat.id)}
                      disabled={loadingCategorias}
                      className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 ${
                        tieneCat
                          ? "border-green-500 bg-green-500/10"
                          : `${dark ? "border-gray-600" : "border-gray-200"}`
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        tieneCat ? "bg-green-500" : "border-2 border-gray-400"
                      }`}>
                        {tieneCat && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className={`text-sm ${textPrimary}`}>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {userCategorias.length === 0 && (
            <div className={`p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30`}>
              <p className="text-yellow-500 text-sm">
                ⚠️ Este usuario no tiene categorías asignadas. No podrá ver productos.
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
                { id: "custom", label: `Custom (${stats.productosCustom})` },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setProductFilter(filter.id);
                    setFilterCategory("all");
                    setFilterSubcategory("all");
                    setFilterTipo("all");
                  }}
                  className={`py-1 px-3 rounded text-xs font-medium transition-all ${
                    productFilter === filter.id
                      ? filter.id === "custom"
                        ? "bg-purple-500 text-white"
                        : "bg-blue-500 text-white"
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

          {/* FILTROS DE CATEGORÍA/SUBCATEGORÍA Y TIPO */}
          <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setFilterSubcategory("all");
              }}
              className={`px-1.5 sm:px-2 py-1 rounded text-xs border ${dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
            >
              <option value="all">📁 Categoría</option>
              {filterCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {filterCategory !== "all" && (
              <select
                value={filterSubcategory}
                onChange={(e) => setFilterSubcategory(e.target.value)}
                className={`px-1.5 sm:px-2 py-1 rounded text-xs border ${dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
              >
                <option value="all">📂 Sub</option>
                {subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            )}

            <div className={`flex gap-1 p-1 rounded-lg ${dark ? "bg-gray-900" : "bg-gray-100"}`}>
              {[
                { id: "all", label: "Todos" },
                { id: "unit", label: "📦 Unitario" },
                { id: "weight", label: "⚖️ Peso (kg)" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterTipo(f.id)}
                  className={`py-1 px-2 rounded text-xs font-medium transition-all ${
                    filterTipo === f.id
                      ? "bg-green-500 text-white"
                      : `${textSecondary} hover:${textPrimary}`
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {(filterCategory !== "all" || filterSubcategory !== "all" || filterTipo !== "all") && (
              <button
                onClick={() => {
                  setFilterCategory("all");
                  setFilterSubcategory("all");
                  setFilterTipo("all");
                }}
                className={`text-xs py-1 px-2 rounded ${dark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
              >
                ✕ Limpiar
              </button>
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
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <p className={`font-medium truncate ${isInactive ? "line-through opacity-60" : ""} ${textPrimary}`}>
                          {name || "Sin nombre"}
                        </p>
                        {/* Badge para tipo de producto (Base/Custom) */}
                        <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${
                          isBase
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {isBase ? "Base" : "Custom"}
                        </span>
                        {/* Badge para tipo de venta (peso/unit) */}
                        {isBase && p.products_base?.type_unit === "weight" && (
                          <span className="px-1.5 py-0.5 rounded text-xs shrink-0 bg-green-500/20 text-green-400">
                            ⚖️ kg
                          </span>
                        )}
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

      {activeSection === "configuracion" && (
        <div className="space-y-3">
          {user.tenant_id ? (
            <SucursalSettings profile={user} />
          ) : (
            <div className={`p-4 rounded-xl ${bgCard}`}>
              <p className={`text-sm ${textSecondary}`}>
                Este usuario no pertenece a un negocio, así que no tiene
                tienda propia para estilizar.
              </p>
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
  const { addUserOptimistic, userCategoriesMap, systemCategories, invalidateUserCategories, setUserCategoriesMap } = useAdminData();
  const { users, loading } = useAdminUsers();
  const { categorias } = useAdminCategories();
  const [expandedUser, setExpandedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user", categorias: [] });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(profile?.tenant_id || "");
  const [roleFilter, setRoleFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const isSuperAdmin = profile?.role === "super_admin";

  useEffect(() => {
    if (!isSuperAdmin) return;
    setSelectedTenantId((prev) => prev || profile?.tenant_id || "");
    supabase
      .from("tenants")
      .select("id, name")
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTenants(data || []);
      });
  }, [isSuperAdmin, profile?.tenant_id]);

  const tenantsMap = useMemo(() => {
    const map = {};
    tenants.forEach((t) => { map[t.id] = t.name; });
    return map;
  }, [tenants]);

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

      const targetTenantId = isSuperAdmin
        ? Number(selectedTenantId)
        : profile.tenant_id;

      if (!targetTenantId) {
        throw new Error("Elegí un negocio destino");
      }

      // El RPC crea el auth user + profile + identidad todo server-side.
      // No usa signUp, asi que la sesion del admin NO se toca nunca.
      const { data: newUserId, error: profileError } = await supabase.rpc(
        "admin_create_user",
        {
          p_email: newUser.email,
          p_password: newUser.password,
          p_name: newUser.name,
          p_role: newUser.role,
          p_tenant_id: targetTenantId,
          p_parent_admin_id: profile.id,
        }
      );

      if (profileError) throw profileError;

      // Insertar categorías seleccionadas
      if (newUser.categorias && newUser.categorias.length > 0) {
        const categoriasData = newUser.categorias.map(catId => ({
          user_id: newUserId,
          category_id: catId,
          active: true
        }));
        
        const { error: catError } = await supabase
          .from("user_categories")
          .insert(categoriasData);
        
        if (catError) {
          console.error("Error inserting categories:", catError);
        }
      }

      // Actualización optimista: agregar usuario y sus categorías
      const newUserData = {
        id: newUserId,
        name: newUser.name,
        role: newUser.role,
        tenant_id: targetTenantId,
        created_at: new Date().toISOString()
      };
      addUserOptimistic(newUserData);
      
      // Agregar categorías al cache
      if (newUser.categorias?.length > 0) {
        setUserCategoriesMap((prev) => ({
          ...prev,
          [newUserId]: newUser.categorias
        }));
      }

      setNewUser({ name: "", email: "", password: "", role: "user", categorias: [] });
      setCreateSuccess("¡Negocio creado exitosamente!");
      setShowAddForm(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const hasActiveFilters = searchTerm || roleFilter || tenantFilter || categoryFilter;

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setTenantFilter("");
    setCategoryFilter("");
  };

  const filteredUsers = users
    .filter(u => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!u.name?.toLowerCase().includes(q) && !u.role?.toLowerCase().includes(q)) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (tenantFilter === "sin_tenant") {
        if (u.tenant_id != null) return false;
      } else if (tenantFilter && String(u.tenant_id) !== tenantFilter) {
        return false;
      }
      if (categoryFilter === "with" && !(userCategoriesMap[u.id]?.length > 0)) return false;
      if (categoryFilter === "without" && (userCategoriesMap[u.id]?.length > 0)) return false;
      return true;
    })
    .sort((a, b) => {
      const order = { super_admin: 0, admin: 1, user: 2 };
      const ra = order[a.role] ?? 3;
      const rb = order[b.role] ?? 3;
      if (ra !== rb) return ra - rb;
      return (a.name || "").localeCompare(b.name || "");
    });

  // Agrupa los usuarios por tenant (solo para super_admin)
  const tenantGroups = useMemo(() => {
    if (!isSuperAdmin) return [];

    const groupsMap = {};
    filteredUsers.forEach(u => {
      const key = u.tenant_id ?? "sin_tenant";
      if (!groupsMap[key]) groupsMap[key] = [];
      groupsMap[key].push(u);
    });

    const groups = Object.entries(groupsMap).map(([tenantId, users]) => ({
      tenantId,
      name: tenantId === "sin_tenant"
        ? "Sin negocio"
        : (tenantsMap[tenantId] || `Negocio ${tenantId}`),
      users,
      usersCount: users.length,
      admins: users.filter(u => u.role === "admin").length,
    }));

    groups.sort((a, b) => {
      if (a.tenantId === "sin_tenant") return 1;
      if (b.tenantId === "sin_tenant") return -1;
      return a.name.localeCompare(b.name);
    });

    return groups;
  }, [filteredUsers, isSuperAdmin, tenantsMap]);

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
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

  const renderUserCard = (u) => (
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
          {isSuperAdmin && tenantsMap[u.tenant_id] && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
              {tenantsMap[u.tenant_id]}
            </span>
          )}
          {userCategoriesMap[u.id]?.length > 0 && (
            <div className="flex gap-1">
              {userCategoriesMap[u.id].slice(0, 2).map(catId => {
                const cat = systemCategories.find(c => c.id === catId);
                return cat ? (
                  <span key={catId} className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                    {cat.name}
                  </span>
                ) : null;
              })}
              {userCategoriesMap[u.id].length > 2 && (
                <span className={`text-xs ${textSecondary}`}>+{userCategoriesMap[u.id].length - 2}</span>
              )}
            </div>
          )}
          <span className={`text-2xl ${textSecondary} transition-transform ${expandedUser === u.id ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>
      </div>

      {/* EXPANDED DETAIL */}
      {expandedUser === u.id && (
        <div className={`border-t ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <UserExpandedDetail key={u.id} user={u} onClose={() => setExpandedUser(null)} invalidateUserCategories={invalidateUserCategories} />
        </div>
      )}
    </div>
  );

  return (
    <div className={`p-1 sm:p-2 md:p-4 space-y-2 sm:space-y-4 ${dark ? "bg-gray-900" : "bg-gray-50"} min-h-screen pb-20 md:pb-0`}>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className={`text-lg md:text-2xl font-bold ${textPrimary}`}>
          🏪 Negocios / Usuarios
        </h1>
        <div className="flex items-center gap-2">
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

      {/* STATS RESUMEN (solo super admin) */}
      {isSuperAdmin && (
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2.5 rounded-xl border ${bgCard} text-center`}>
            <p className="text-xl font-bold text-blue-500">{tenantGroups.length}</p>
            <p className={`text-[11px] ${textSecondary}`}>Negocios</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${bgCard} text-center`}>
            <p className={`text-xl font-bold ${textPrimary}`}>{users.length}</p>
            <p className={`text-[11px] ${textSecondary}`}>Usuarios</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${bgCard} text-center`}>
            <p className="text-xl font-bold text-red-500">
              {users.filter(u => u.role === "admin").length}
            </p>
            <p className={`text-[11px] ${textSecondary}`}>Admins</p>
          </div>
        </div>
      )}

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
              <option value="user">Negocio</option>
              <option value="admin">Administrador</option>
            </select>
            {isSuperAdmin && (
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
              >
                <option value="">Seleccionar negocio...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (ID {t.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selector de categorías */}
          <div>
            <label className={`block text-sm mb-1 ${textSecondary}`}>Categorías asociadas</label>
            <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 rounded-lg border ${dark ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"}`}>
              {categorias.map(cat => (
                <label
                  key={cat.id}
                  className={`flex items-center gap-2 text-xs cursor-pointer p-1 rounded ${textPrimary}`}
                >
                  <input
                    type="checkbox"
                    checked={newUser.categorias.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewUser({ ...newUser, categorias: [...newUser.categorias, cat.id] });
                      } else {
                        setNewUser({ ...newUser, categorias: newUser.categorias.filter(id => id !== cat.id) });
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
            {categorias.length === 0 && (
              <p className={`text-xs ${textSecondary}`}>No hay categorías disponibles</p>
            )}
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
                setNewUser({ name: "", email: "", password: "", role: "user", categorias: [] });
              }}
              className={`px-4 py-2.5 rounded-lg border ${dark ? "border-gray-600 text-gray-400" : "border-gray-300 text-gray-600"}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* FILTROS */}
      <div className={`p-2.5 md:p-3 rounded-xl border ${bgCard} space-y-2`}>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Buscar por nombre o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 min-w-[160px] px-3 py-2 rounded-lg border text-sm ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200"} ${textPrimary}`}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`px-2.5 py-2 rounded-lg border text-sm ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"}`}
          >
            <option value="">Rol: todos</option>
            <option value="super_admin">Super admin</option>
            <option value="admin">Admin</option>
            <option value="user">Negocio</option>
          </select>
          {isSuperAdmin && (
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className={`px-2.5 py-2 rounded-lg border text-sm ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"}`}
            >
              <option value="">Negocio: todos</option>
              <option value="sin_tenant">🚫 Sin negocio</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`px-2.5 py-2 rounded-lg border text-sm ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"}`}
          >
            <option value="">Categorías: todas</option>
            <option value="with">Con categorías</option>
            <option value="without">Sin categorías</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* USERS LIST */}
      {isSuperAdmin ? (
        <div className="space-y-5 pb-20 md:pb-0">
          {tenantGroups.map(group => (
            <div key={group.tenantId}>
              {/* TENANT HEADER */}
              <div className={`flex items-center justify-between gap-2 mb-3 px-3 py-2.5 rounded-xl border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${
                    group.tenantId === "sin_tenant" ? "bg-yellow-500/20" : "bg-blue-500/20"
                  }`}>
                    {group.tenantId === "sin_tenant" ? "🚫" : "🏪"}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm md:text-base truncate ${textPrimary}`}>
                      {group.name}
                    </p>
                    <p className={`text-[11px] ${textSecondary}`}>
                      {group.admins > 0 ? `${group.admins} admin` : "Sin admin"} · {group.usersCount - group.admins} negocio
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  group.tenantId === "sin_tenant"
                    ? "bg-yellow-500/20 text-yellow-500"
                    : "bg-blue-500/20 text-blue-400"
                }`}>
                  {group.usersCount} {group.usersCount === 1 ? "usuario" : "usuarios"}
                </span>
              </div>
              <div className={`space-y-3 ${dark ? "border-l-2 border-gray-700 pl-3" : "border-l-2 border-blue-200 pl-3"}`}>
                {group.users.map(u => renderUserCard(u))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-20 md:pb-0">
          {filteredUsers.map(u => renderUserCard(u))}
        </div>
      )}

      {filteredUsers.length === 0 && (
        <div className={`text-center py-12 ${textSecondary}`}>
          <div className="text-5xl mb-4">🔍</div>
          <p>{hasActiveFilters ? "No hay usuarios que coincidan con los filtros" : "No se encontraron usuarios"}</p>
        </div>
      )}
    </div>
  );
}
