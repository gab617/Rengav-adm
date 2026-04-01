import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useAppContext } from "../../../contexto/Context";
import { useAdminData } from "../../../hooks/useAdminData";

export function AssignProducts() {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const { 
    users: cachedUsers, 
    productsBase: cachedProducts, 
    systemCategories: cachedSystemCats,
    productCounts: cachedCounts,
    isLoaded,
    loadInitialData,
    invalidateUserProducts
  } = useAdminData();

  const [users, setUsers] = useState(cachedUsers);
  const [selectedUser, setSelectedUser] = useState(null);
  const [products, setProducts] = useState(cachedProducts);
  const [userProducts, setUserProducts] = useState(new Set());
  const [assignedProductsData, setAssignedProductsData] = useState([]);
  const [userProductCounts, setUserProductCounts] = useState(cachedCounts);
  const [loading, setLoading] = useState(!isLoaded);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedProducts, setSelectedProducts] = useState({});
  const [selectedToDelete, setSelectedToDelete] = useState(new Set());
  const [precioBaseVenta, setPrecioBaseVenta] = useState("");
  const [precioBaseCompra, setPrecioBaseCompra] = useState("");
  const [stockBase, setStockBase] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [activeTab, setActiveTab] = useState("asignar");
  const [notification, setNotification] = useState(null);
  const [showBrandFilter, setShowBrandFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showSubcategoryFilter, setShowSubcategoryFilter] = useState(false);
  const [userCategories, setUserCategories] = useState([]);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  useEffect(() => {
    async function load() {
      if (!isLoaded) {
        setLoading(true);
        await loadInitialData();
      }
      
      // Sincronizar con datos del cache
      setUsers(cachedUsers);
      setProducts(cachedProducts);
      setUserProductCounts(cachedCounts);
      
      setLoading(false);
    }
    load();
  }, []);

  // Actualizar productos cuando el cache cambie (ej: se agregó un nuevo producto)
  useEffect(() => {
    if (isLoaded && cachedProducts.length > 0) {
      setProducts(cachedProducts);
    }
  }, [cachedProducts, isLoaded]);

  const loadAssignedProducts = async () => {
    if (!selectedUser) {
      setUserProducts(new Set());
      setAssignedProductsData([]);
      setSelectedProducts({});
      setSelectedToDelete(new Set());
      return;
    }

    const currentUserId = selectedUser.id;

    const { data } = await supabase
      .from("user_products")
      .select("base_id, precio_venta, active, id")
      .eq("user_id", currentUserId);

    if (selectedUser?.id !== currentUserId) return;

const ids = new Set();
    const productData = [];
    data?.forEach((up) => {
      if (!up.base_id) return;
      
      const baseIdStr = String(up.base_id);
      ids.add(baseIdStr);
      
      productData.push({ 
        base_id: baseIdStr, 
        precio_venta: up.precio_venta,
        active: up.active !== false,
        id: up.id
      });
    });

    setUserProducts(ids);
    setAssignedProductsData(productData);
  };

  useEffect(() => {
    loadAssignedProducts();
  }, [selectedUser, userCategories]);

  // Cargar categorías del usuario seleccionado Y el conteo de productos
  useEffect(() => {
    if (!selectedUser?.id) {
      setUserCategories([]);
      return;
    }
    
    async function loadUserData() {
      const [userCatsRes, countRes] = await Promise.all([
        supabase
          .from("user_categories")
          .select("category_id")
          .eq("user_id", selectedUser.id)
          .eq("active", true),
        supabase
          .from("user_products")
          .select("id", { count: "exact" })
          .eq("user_id", selectedUser.id)
      ]);
      
      setUserCategories(userCatsRes.data?.map(uc => uc.category_id) || []);
      
      setUserProductCounts(prev => ({
        ...prev,
        [selectedUser.id]: countRes.count || 0
      }));
    }
    
    loadUserData();
  }, [selectedUser?.id]);

  const reloadUserProducts = async () => {
    if (!selectedUser) return;
    
    const currentUserId = selectedUser.id;
    
    await loadAssignedProducts();

    // Usar invalidateUserProducts del contexto para actualizar solo este usuario
    const newProducts = await invalidateUserProducts(currentUserId);
    
    // Actualizar productos asignados con los nuevos datos
    const ids = new Set();
    const productData = [];
    newProducts?.forEach((up) => {
      if (!up.base_id) return;
      
      const baseIdStr = String(up.base_id);
      ids.add(baseIdStr);
      
      productData.push({ 
        base_id: baseIdStr, 
        precio_venta: up.precio_venta,
        active: up.active !== false,
        id: up.id
      });
    });
    
    setUserProducts(ids);
    setAssignedProductsData(productData);
    setUserProductCounts((prev) => ({
      ...prev,
      [currentUserId]: newProducts?.length || 0,
    }));
  };

  const uniqueBrands = useMemo(() => {
    const brands = {};
    products.forEach((p) => {
      if (p.brand_id && p.brands?.name) {
        brands[p.brand_id] = p.brands.name;
      }
    });
    return Object.entries(brands).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const uniqueCategories = useMemo(() => {
    // Filtrar productos solo del usuario
    const productosDelUsuario = products.filter(
      (p) => p.category_id && userCategories.includes(p.category_id)
    );
    
    const cats = {};
    productosDelUsuario.forEach((p) => {
      if (p.categories?.name) {
        cats[p.categories.name] = (cats[p.categories.name] || 0) + 1;
      }
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [products, userCategories]);

  const uniqueSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const productosDeCategoria = products.filter(
      (p) => p.category_id && userCategories.includes(p.category_id) && p.categories?.name === selectedCategory
    );
    const subs = {};
    productosDeCategoria.forEach((p) => {
      if (p.subcategories?.name) {
        subs[p.subcategories.name] = (subs[p.subcategories.name] || 0) + 1;
      }
    });
    return Object.entries(subs).sort((a, b) => b[1] - a[1]);
  }, [products, userCategories, selectedCategory]);

  const productosFiltrados = useMemo(() => {
    let disponibles = products.filter(
      (p) => !userProducts.has(String(p.id))
    );

    // Filtrar solo productos de las categorías del usuario
    if (userCategories.length > 0) {
      disponibles = disponibles.filter(
        (p) => p.category_id && userCategories.includes(p.category_id)
      );
    }

    if (selectedCategory) {
      disponibles = disponibles.filter(
        (p) => p.categories?.name === selectedCategory
      );
    }

    if (selectedSubcategory) {
      disponibles = disponibles.filter(
        (p) => p.subcategories?.name === selectedSubcategory
      );
    }

    if (selectedBrand) {
      disponibles = disponibles.filter(
        (p) => p.brand_id === parseInt(selectedBrand)
      );
    }

    if (!search) return [...disponibles].sort((a, b) => a.name.localeCompare(b.name));

    const lower = search.toLowerCase();
    return disponibles
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.brands?.name?.toLowerCase().includes(lower)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, userProducts, selectedBrand, selectedCategory, selectedSubcategory, userCategories]);

  const productosAsignadosFiltrados = useMemo(() => {
    let filtrados = [];
    
    for (const ap of assignedProductsData) {
      if (!ap.base_id) continue;
      
      const baseProduct = products.find((p) => String(p.id) === ap.base_id);
      if (!baseProduct) continue;
      
      filtrados.push({
        ...ap,
        name: baseProduct?.name || "Producto desconocido",
        brand: baseProduct?.brands?.name || "Sin marca",
      });
    }

    if (!search) return filtrados;

    const lower = search.toLowerCase();
    return filtrados.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.brand && p.brand.toLowerCase().includes(lower))
    );
  }, [assignedProductsData, products, search]);

  const productosActivos = useMemo(
    () => productosAsignadosFiltrados.filter((p) => p.active),
    [productosAsignadosFiltrados]
  );

  const productosInactivos = useMemo(
    () => productosAsignadosFiltrados.filter((p) => !p.active),
    [productosAsignadosFiltrados]
  );

  const toggleProduct = (id) => {
    if (selectedProducts[id]) {
      const newSelected = { ...selectedProducts };
      delete newSelected[id];
      setSelectedProducts(newSelected);
    } else {
      setSelectedProducts((prev) => ({
        ...prev,
        [id]: { 
          precio_venta: parseFloat(precioBaseVenta) || 0,
          precio_compra: 0,
          stock: 0
        },
      }));
    }
  };

  const toggleProductToDelete = (baseId) => {
    setSelectedToDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(baseId)) {
        newSet.delete(baseId);
      } else {
        newSet.add(baseId);
      }
      return newSet;
    });
  };

  const selectAllToDelete = () => {
    setSelectedToDelete(new Set(assignedProductsData.map((ap) => ap.base_id)));
  };

  const deselectAllToDelete = () => setSelectedToDelete(new Set());

  const updatePrecio = (id, value) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [id]: { ...prev[id], precio_venta: parseFloat(value) || 0 },
    }));
  };

  const updatePrecioCompra = (id, value) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [id]: { ...prev[id], precio_compra: parseFloat(value) || 0 },
    }));
  };

  const updateStock = (id, value) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [id]: { ...prev[id], stock: parseInt(value) || 0 },
    }));
  };

  const applyBaseToAll = (field, value) => {
    if (value === "" && field !== "stock") return;
    const updated = {};
    const val = field === "stock" ? parseInt(value) || 0 : parseFloat(value) || 0;
    Object.keys(selectedProducts).forEach((id) => {
      updated[id] = { ...selectedProducts[id], [field]: val };
    });
    setSelectedProducts(updated);
    const labels = { precio_venta: "precio venta", precio_compra: "precio compra", stock: "stock" };
    showNotification(`${labels[field]} ${value} aplicado a ${Object.keys(updated).length} productos`);
  };

  const selectAll = () => {
    const all = {};
    productosFiltrados.forEach((p) => {
      all[p.id] = { 
        precio_venta: 0,
        precio_compra: 0,
        stock: 0
      };
    });
    setSelectedProducts(all);
  };

  const deselectAll = () => setSelectedProducts({});

  const selectFirst = (n = 10) => {
    const first = {};
    productosFiltrados.slice(0, n).forEach((p) => {
      first[p.id] = { 
        precio_venta: 0,
        precio_compra: 0,
        stock: 0
      };
    });
    setSelectedProducts(first);
    showNotification(`${Math.min(n, productosFiltrados.length)} productos seleccionados`);
  };

  const handleAsignar = async () => {
    if (!selectedUser || Object.keys(selectedProducts).length === 0) return;

    // Validaciones
    const sinStock = Object.values(selectedProducts).filter(p => !p.stock || p.stock === 0).length;
    const sinPrecio = Object.values(selectedProducts).filter(p => !p.precio_venta || p.precio_venta === 0).length;
    
    if (sinStock > 0 || sinPrecio > 0) {
      let warnings = [];
      if (sinStock > 0) warnings.push(`${sinStock} sin stock`);
      if (sinPrecio > 0) warnings.push(`${sinPrecio} sin precio`);
      showNotification(`⚠️ ${warnings.join(", ")}`, "warning");
    }

    const userId = selectedUser.id;
    const userName = selectedUser.name;
    const ids = Object.keys(selectedProducts);
    const productsToInsert = ids.map((base_id) => ({
      user_id: userId,
      base_id,
      precio_venta: selectedProducts[base_id]?.precio_venta || 0,
      precio_compra: selectedProducts[base_id]?.precio_compra || 0,
      stock: selectedProducts[base_id]?.stock || 0,
    }));

    setAsignando(true);

    try {
      await supabase.from("user_products").insert(productsToInsert);

      await reloadUserProducts();
      setPrecioBaseVenta("");
      setPrecioBaseCompra("");
      setStockBase("");
      setSelectedProducts({});
      showNotification(`¡${ids.length} productos asignados a ${userName}!`, "success");
    } catch (err) {
      console.error(err);
      if (err?.code === "23505") {
        await reloadUserProducts();
        showNotification("Algunos productos ya estaban asignados.", "warning");
      } else {
        showNotification("Error al asignar", "error");
      }
    } finally {
      setAsignando(false);
    }
  };

  const handleEliminar = async () => {
    if (!selectedUser || selectedToDelete.size === 0) return;

    const countToDelete = selectedToDelete.size;

    if (!confirm(`¿Desactivar ${countToDelete} productos?`)) return;

    setEliminando(true);

    try {
      const updates = [];
      for (const baseId of selectedToDelete) {
        const product = productosActivos.find((p) => p.base_id === baseId);
        if (product) {
          updates.push(
            supabase
              .from("user_products")
              .update({ active: false, stock: 0 })
              .eq("id", product.id)
          );
        }
      }

      await Promise.all(updates);

      await reloadUserProducts();
      setSelectedToDelete(new Set());
      showNotification(`${countToDelete} productos desactivados`, "success");
    } catch (err) {
      console.error(err);
      showNotification("Error al desactivar", "error");
    } finally {
      setEliminando(false);
    }
  };

  const handleReactivar = async (productId) => {
    try {
      await supabase
        .from("user_products")
        .update({ active: true })
        .eq("id", productId);

      await reloadUserProducts();
      showNotification("Producto reactivado", "success");
    } catch (err) {
      console.error(err);
      showNotification("Error al reactivar", "error");
    }
  };

  const baseCard = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white" : "bg-gray-50";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse text-xl">Cargando centro de mando...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-36 md:pb-4 ${dark ? "bg-gray-900" : "bg-gray-100"}`}>
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white transform transition-all duration-300 ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "warning"
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
        >
          {notification.msg}
        </div>
      )}

      <div className={`p-3 md:p-4 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <h1 className={`text-lg md:text-2xl font-bold ${textPrimary}`}>
          ⚡ Asignaciones
        </h1>

        <div className="flex gap-2 md:gap-3 mt-3 md:mt-4 overflow-x-auto pb-2">
          <div className={`px-3 md:px-4 py-2 rounded-xl ${dark ? "bg-gray-800" : "bg-white"} border ${baseCard} min-w-fit`}>
            <div className={`text-xl md:text-2xl font-bold ${textPrimary}`}>{users.length}</div>
            <div className={`text-xs ${textSecondary}`}>Usuarios</div>
          </div>
          <div className={`px-3 md:px-4 py-2 rounded-xl ${dark ? "bg-gray-800" : "bg-white"} border ${baseCard} min-w-fit`}>
            <div className={`text-xl md:text-2xl font-bold ${textPrimary}`}>{products.length}</div>
            <div className={`text-xs ${textSecondary}`}>Base</div>
          </div>
          <div className={`px-3 md:px-4 py-2 rounded-xl ${dark ? "bg-gray-800" : "bg-white"} border ${baseCard} min-w-fit`}>
            <div className={`text-xl md:text-2xl font-bold text-blue-500`}>
              {productosFiltrados.length}
            </div>
            <div className={`text-xs ${textSecondary}`}>Disponibles</div>
          </div>
          <div className={`px-4 py-2 rounded-xl ${dark ? "bg-gray-800" : "bg-white"} border ${baseCard} min-w-fit`}>
            <div className={`text-2xl font-bold text-green-500`}>
              {Object.keys(selectedProducts).length}
            </div>
            <div className={`text-xs ${textSecondary}`}>Seleccionar</div>
          </div>
          <div className={`px-4 py-2 rounded-xl ${dark ? "bg-gray-800" : "bg-white"} border ${baseCard} min-w-fit`}>
            <div className={`text-2xl font-bold text-red-500`}>
              {assignedProductsData.length}
            </div>
            <div className={`text-xs ${textSecondary}`}>Asignados</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className={`lg:w-72 w-full p-3 md:p-4 lg:border-r ${dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"} border-b lg:border-b-0 max-h-48 lg:max-h-none overflow-y-auto`}>
          <h2 className={`font-semibold mb-3 ${textPrimary}`}>👥 Usuarios</h2>

          <div className="space-y-2 max-h-32 lg:max-h-96 overflow-y-auto">
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              const count = userProductCounts[user.id] || 0;

              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user);
                    setActiveTab("asignar");
                    setSearch("");
                  }}
                  className={`w-full p-2 md:p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500"
                      : `${baseCard} hover:border-blue-400`
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-medium truncate text-sm ${textPrimary}`}>{user.name}</span>
                    <span
                      className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shrink-0 ${
                        count > 0
                          ? "bg-green-500/20 text-green-500"
                          : dark
                          ? "bg-gray-700 text-gray-400"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-3 md:p-4 pb-20 lg:pb-4">
          {!selectedUser ? (
            <div className={`flex flex-col items-center justify-center h-48 lg:h-64 ${textSecondary}`}>
              <div className="text-4xl md:text-6xl mb-3 md:mb-4">👆</div>
              <p className="text-sm md:text-base">Selecciona un usuario</p>
            </div>
          ) : (
            <>
              <div className={`flex gap-1 md:gap-2 mb-3 md:mb-4 p-1 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                <button
                  onClick={() => setActiveTab("asignar")}
                  className={`flex-1 py-2 px-2 md:px-4 rounded-lg font-medium transition-all text-xs md:text-sm ${
                    activeTab === "asignar"
                      ? "bg-blue-500 text-white shadow"
                      : `${textSecondary} hover:${textPrimary}`
                  }`}
                >
                  ➕ Asignar ({productosFiltrados.length})
                </button>
                <button
                  onClick={() => setActiveTab("asignados")}
                  className={`flex-1 py-2 px-2 md:px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm ${
                    activeTab === "asignados"
                      ? "bg-red-500 text-white shadow"
                      : `${textSecondary} hover:${textPrimary}`
                  }`}
                >
                  📋 Asignados ({productosActivos.length})
                  {selectedToDelete.size > 0 && (
                    <span className="bg-white text-red-500 rounded-full w-4 h-4 md:w-5 md:h-5 text-xs flex items-center justify-center">
                      {selectedToDelete.size}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === "asignar" ? (
                <>
                  <div className={`rounded-xl p-3 mb-4 ${baseCard} border`}>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-24">
                        <label className={`text-xs block mb-1 ${textSecondary}`}>Precio Venta</label>
                        <input
                          type="number"
                          placeholder="$"
                          value={precioBaseVenta}
                          onChange={(e) => setPrecioBaseVenta(e.target.value)}
                          className={`w-full p-2 rounded-lg border ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      <button
                        onClick={() => applyBaseToAll("precio_venta", precioBaseVenta)}
                        disabled={!precioBaseVenta || Object.keys(selectedProducts).length === 0}
                        className="px-2 py-2 bg-purple-500 text-white rounded-lg text-xs disabled:opacity-40 hover:bg-purple-600 transition-colors"
                      >
                        Aplicar
                      </button>
                      
                      <div className="flex-1 min-w-24">
                        <label className={`text-xs block mb-1 ${textSecondary}`}>Precio Compra</label>
                        <input
                          type="number"
                          placeholder="$"
                          value={precioBaseCompra}
                          onChange={(e) => setPrecioBaseCompra(e.target.value)}
                          className={`w-full p-2 rounded-lg border ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      <button
                        onClick={() => applyBaseToAll("precio_compra", precioBaseCompra)}
                        disabled={!precioBaseCompra || Object.keys(selectedProducts).length === 0}
                        className="px-2 py-2 bg-blue-500 text-white rounded-lg text-xs disabled:opacity-40 hover:bg-blue-600 transition-colors"
                      >
                        Aplicar
                      </button>

                      <div className="flex-1 min-w-24">
                        <label className={`text-xs block mb-1 ${textSecondary}`}>Stock</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={stockBase}
                          onChange={(e) => setStockBase(e.target.value)}
                          className={`w-full p-2 rounded-lg border ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      <button
                        onClick={() => applyBaseToAll("stock", stockBase)}
                        disabled={!stockBase && stockBase !== "0" || Object.keys(selectedProducts).length === 0}
                        className="px-2 py-2 bg-green-500 text-white rounded-lg text-xs disabled:opacity-40 hover:bg-green-600 transition-colors"
                      >
                        Aplicar
                      </button>

                      <button
                        onClick={Object.keys(selectedProducts).length === productosFiltrados.length ? deselectAll : selectAll}
                        className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
                      >
                        {Object.keys(selectedProducts).length === productosFiltrados.length ? "Limpiar" : "Todos"}
                      </button>
                      
                      <button 
                        onClick={() => {
                          const cleared = {};
                          Object.keys(selectedProducts).forEach(id => {
                            cleared[id] = { precio_venta: 0, precio_compra: 0, stock: 0 };
                          });
                          setSelectedProducts(cleared);
                        }}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                      >
                        Limpiar Valores
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => selectFirst(5)} className={`px-3 py-1 rounded-full text-xs ${dark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} ${textSecondary}`}>
                        Primeros 5
                      </button>
                      <button onClick={() => selectFirst(10)} className={`px-3 py-1 rounded-full text-xs ${dark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} ${textSecondary}`}>
                        Primeros 10
                      </button>
                      <button onClick={() => selectFirst(25)} className={`px-3 py-1 rounded-full text-xs ${dark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} ${textSecondary}`}>
                        Primeros 25
                      </button>
                    </div>
                  </div>

                  <div className={`rounded-xl p-3 mb-4 ${baseCard} border`}>
                    {/* SEARCH */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`w-full p-2.5 pl-10 rounded-lg border ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    </div>

                    {/* ACTIVE FILTERS BADGES */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedCategory && (
                        <button
                          onClick={() => setSelectedCategory("")}
                          className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 flex items-center gap-1 hover:bg-purple-500/30"
                        >
                          📁 {selectedCategory} ✕
                        </button>
                      )}
                      {selectedBrand && (
                        <button
                          onClick={() => setSelectedBrand("")}
                          className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1 hover:bg-blue-500/30"
                        >
                          🏷️ {uniqueBrands.find(([id]) => id === selectedBrand)?.[1]} ✕
                        </button>
                      )}
                      {(selectedCategory || selectedBrand) && (
                        <button
                          onClick={() => { setSelectedCategory(""); setSelectedBrand(""); }}
                          className={`px-3 py-1 rounded-full text-xs ${dark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"} hover:opacity-70`}
                        >
                          Limpiar todo
                        </button>
                      )}
                    </div>

                    {/* TOGGLE FILTERS */}
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => { setShowCategoryFilter(!showCategoryFilter); setShowBrandFilter(false); setShowSubcategoryFilter(false); }}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          showCategoryFilter || selectedCategory
                            ? "bg-purple-500 text-white"
                            : `${baseCard} ${textSecondary} hover:${textPrimary}`
                        }`}
                      >
                        📁 Categorías {selectedCategory && <span className="bg-white/30 px-1.5 rounded text-xs">1</span>}
                      </button>
                      {selectedCategory && (
                        <button
                          onClick={() => { setShowSubcategoryFilter(!showSubcategoryFilter); setShowCategoryFilter(false); setShowBrandFilter(false); }}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            showSubcategoryFilter || selectedSubcategory
                              ? "bg-pink-500 text-white"
                              : `${baseCard} ${textSecondary} hover:${textPrimary}`
                          }`}
                        >
                          📂 Subcategorías {selectedSubcategory && <span className="bg-white/30 px-1.5 rounded text-xs">1</span>}
                        </button>
                      )}
                      <button
                        onClick={() => { setShowBrandFilter(!showBrandFilter); setShowCategoryFilter(false); setShowSubcategoryFilter(false); }}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          showBrandFilter || selectedBrand
                            ? "bg-blue-500 text-white"
                            : `${baseCard} ${textSecondary} hover:${textPrimary}`
                        }`}
                      >
                        🏷️ Marcas {selectedBrand && <span className="bg-white/30 px-1.5 rounded text-xs">1</span>}
                      </button>
                    </div>

                    {/* CATEGORY FILTER */}
                    {showCategoryFilter && (
                      <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => { setSelectedCategory(""); setShowCategoryFilter(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            !selectedCategory ? "bg-purple-500 text-white" : `${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"} ${textSecondary}`
                          }`}
                        >
                          Todas ({productosFiltrados.length})
                        </button>
                        {uniqueCategories.map(([name]) => {
                          const disponiblesDelUsuario = products.filter(
                            (p) => p.category_id && userCategories.includes(p.category_id)
                          );
                          const availableCount = disponiblesDelUsuario.filter((p) => p.categories?.name === name && !userProducts.has(String(p.id))).length;
                          return (
                            <button
                              key={name}
                              onClick={() => { setSelectedCategory(name); setShowCategoryFilter(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-all ${
                                selectedCategory === name ? "bg-purple-500 text-white" : `${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"} ${textSecondary}`
                              }`}
                            >
                              <span>{name}</span>
                              <span className={`text-xs ${selectedCategory === name ? "text-white/70" : ""}`}>{availableCount}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* SUBCATEGORY FILTER */}
                    {showSubcategoryFilter && selectedCategory && (
                      <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => { setSelectedSubcategory(""); setShowSubcategoryFilter(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            !selectedSubcategory ? "bg-pink-500 text-white" : `${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"} ${textSecondary}`
                          }`}
                        >
                          Todas ({productosFiltrados.length})
                        </button>
                        {uniqueSubcategories.map(([name]) => {
                          const disponiblesDeCategoria = products.filter(
                            (p) => p.category_id && userCategories.includes(p.category_id) && p.categories?.name === selectedCategory
                          );
                          const availableCount = disponiblesDeCategoria.filter((p) => p.subcategories?.name === name && !userProducts.has(String(p.id))).length;
                          return (
                            <button
                              key={name}
                              onClick={() => { setSelectedSubcategory(name); setShowSubcategoryFilter(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-all ${
                                selectedSubcategory === name ? "bg-pink-500 text-white" : `${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"} ${textSecondary}`
                              }`}
                            >
                              <span>{name}</span>
                              <span className={`text-xs ${selectedSubcategory === name ? "text-white/70" : ""}`}>{availableCount}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* BRAND FILTER */}
                    {showBrandFilter && (
                      <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => { setSelectedBrand(""); setShowBrandFilter(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            !selectedBrand ? "bg-blue-500 text-white" : `${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"} ${textSecondary}`
                          }`}
                        >
                          Todas ({products.length - userProducts.size})
                        </button>
                        {uniqueBrands.map(([id, name]) => {
                          const count = products.filter((p) => p.brand_id === parseInt(id) && !userProducts.has(String(p.id))).length;
                          return (
                            <button
                              key={id}
                              onClick={() => { setSelectedBrand(id); setShowBrandFilter(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-all ${
                                selectedBrand === id ? "bg-blue-500 text-white" : `${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"} ${textSecondary}`
                              }`}
                            >
                              <span>{name}</span>
                              <span className={`text-xs ${selectedBrand === id ? "text-white/70" : ""}`}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {productosFiltrados.length === 0 ? (
                    <div className={`text-center py-12 ${textSecondary}`}>
                      {userCategories.length === 0 ? (
                        <>
                          <div className="text-5xl mb-4">📁</div>
                          <p className="font-medium text-yellow-500 mb-2">Este usuario no tiene categorías</p>
                          <p className="text-sm">Asignale categorías en la sección Usuarios para ver productos</p>
                        </>
                      ) : (
                        <>
                          <div className="text-5xl mb-4">✓</div>
                          <p>No hay productos disponibles</p>
                          {(selectedCategory || selectedBrand) && (
                            <button
                              onClick={() => { setSelectedCategory(""); setSelectedBrand(""); }}
                              className="mt-3 text-blue-500 hover:underline"
                            >
                              Limpiar filtros
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm ${textSecondary}`}>
                          {productosFiltrados.length} productos
                        </span>
                        <button
                          onClick={() => productosFiltrados.length > 0 && selectAll()}
                          disabled={productosFiltrados.length === 0}
                          className={`text-xs ${textSecondary} hover:text-blue-400 disabled:opacity-50`}
                        >
                          Seleccionar todos
                        </button>
                      </div>
                      <div className="space-y-2">
                        {productosFiltrados.map((prod) => {
                          const isSelected = !!selectedProducts[prod.id];
                          const tieneWarning = selectedProducts[prod.id]?.precio_venta > 0 && selectedProducts[prod.id]?.precio_compra > 0 && selectedProducts[prod.id].precio_venta < selectedProducts[prod.id].precio_compra;
                          
                          return (
                            <div
                              key={prod.id}
                              onClick={() => toggleProduct(prod.id)}
                              className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                  ? `border-blue-500 bg-blue-500/10 ${tieneWarning ? "ring-2 ring-red-500" : ""}` 
                                  : `${baseCard} hover:border-blue-400`
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-medium text-sm truncate ${textPrimary}`}>{prod.name}</p>
                                    {selectedProducts[prod.id]?.stock === 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400" title="Stock en 0">
                                        📦 0
                                      </span>
                                    )}
                                    {(!selectedProducts[prod.id]?.precio_venta || selectedProducts[prod.id]?.precio_venta === 0) && (
                                      <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400" title="Sin precio">
                                        💰 -
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {prod.brands?.name && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                                      {prod.brands.name}
                                    </span>
                                  )}
                                  {prod.categories?.name && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                                      {prod.categories.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div className="mt-2 pt-2 border-t border-blue-500/30 flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs ${textSecondary}`}>Venta</span>
                                    <input
                                      type="number"
                                      placeholder="$0"
                                      value={selectedProducts[prod.id]?.precio_venta || ""}
                                      onChange={(e) => updatePrecio(prod.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`w-16 p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs ${textSecondary}`}>Compra</span>
                                    <input
                                      type="number"
                                      placeholder="$0"
                                      value={selectedProducts[prod.id]?.precio_compra || ""}
                                      onChange={(e) => updatePrecioCompra(prod.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`w-16 p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs ${textSecondary}`}>Stock</span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={selectedProducts[prod.id]?.stock || ""}
                                      onChange={(e) => updateStock(prod.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`w-12 p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                                    />
                                  </div>
                                  {tieneWarning && (
                                    <span className="text-red-500 font-bold text-xs">⚠️ P. venta &lt; compra</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {Object.keys(selectedProducts).length > 0 && (
                    <div className={`fixed bottom-0 left-0 right-0 p-4 ${dark ? "bg-gray-900 border-t border-gray-800" : "bg-white border-t border-gray-200"} shadow-2xl z-40`}>
                      <div className="max-w-6xl mx-auto">
<div className="flex items-center justify-between gap-4 mb-3">
                          <div>
                            <div className={`font-bold text-lg ${textPrimary}`}>
                              {Object.keys(selectedProducts).length} productos
                            </div>
                            <div className={`text-sm ${textSecondary}`}>
                              → {selectedUser.name}
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-sm ${dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                            {Object.keys(selectedProducts).length} productos seleccionados
                          </div>
                        </div>
                        
                        {/* Warning para precios negativos */}
                        {(() => {
                          let negativoCount = 0;
                          Object.values(selectedProducts).forEach(p => {
                            if (p.precio_venta > 0 && p.precio_compra > 0 && p.precio_venta < p.precio_compra) {
                              negativoCount++;
                            }
                          });
                          return negativoCount > 0 ? (
                            <div className="mb-3 p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                              ⚠️ {negativoCount} producto(s) con precio de venta menor al de compra
                            </div>
                          ) : null;
                        })()}
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button onClick={deselectAll} className={`sm:flex-1 px-4 py-2.5 rounded-xl border ${borderColor} ${textSecondary}`}>
                            Cancelar
                          </button>
                          <button onClick={handleAsignar} disabled={asignando} className="sm:flex-1 px-6 py-2.5 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-600 transition-colors">
                            {asignando ? (
                              <><span className="animate-spin">⟳</span> Asignando...</>
                            ) : (
                              <><span>✓</span> Asignar {Object.keys(selectedProducts).length} productos</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={`rounded-xl p-3 mb-4 ${baseCard} border`}>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button onClick={selectAllToDelete} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors">
                        Seleccionar todos
                      </button>
                      <button onClick={deselectAllToDelete} className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors">
                        Ninguno
                      </button>
                      <span className={`text-sm ${textSecondary}`}>
                        {selectedToDelete.size} de {productosActivos.length} activos
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-xl p-3 mb-4 ${baseCard} border`}>
                    <input
                      type="text"
                      placeholder="Buscar asignados..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                    />
                  </div>

                  {productosActivos.length === 0 && productosInactivos.length === 0 ? (
                    <div className={`text-center py-12 ${textSecondary}`}>
                      <div className="text-5xl mb-4">📦</div>
                      <p>No hay productos asignados</p>
                    </div>
                  ) : (
                    <>
                      {productosActivos.length > 0 && (
                        <div className="space-y-2">
                          <h3 className={`text-sm font-semibold ${textSecondary}`}>
                            ✓ Activos ({productosActivos.length})
                          </h3>
                          {productosActivos.map((prod) => {
                            const isSelected = selectedToDelete.has(prod.base_id);
                            return (
                              <div
                                key={prod.base_id}
                                onClick={() => toggleProductToDelete(prod.base_id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected ? "border-red-500 bg-red-500/10 ring-2 ring-red-500" : `${baseCard} hover:border-red-400`
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? "border-red-500 bg-red-500" : "border-gray-400"
                                  }`}>
                                    {isSelected && <span className="text-white text-xs">✓</span>}
                                  </div>
                                  <div>
                                    <p className={`font-medium ${textPrimary}`}>{prod.name}</p>
                                    <p className={`text-xs ${textSecondary}`}>{prod.brand}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-bold ${textPrimary}`}>${prod.precio_venta}</p>
                                  <p className={`text-xs ${textSecondary}`}>ID: {prod.base_id}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {productosInactivos.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h3 className={`text-sm font-semibold text-red-500`}>
                            ✗ Inactivos ({productosInactivos.length})
                          </h3>
                          {productosInactivos.map((prod) => (
                            <div
                              key={prod.base_id}
                              className={`p-4 rounded-xl border flex items-center justify-between ${dark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center opacity-50">
                                  <span className="text-white text-xs">✗</span>
                                </div>
                                <div>
                                  <p className={`font-medium line-through opacity-60 ${textPrimary}`}>{prod.name}</p>
                                  <p className={`text-xs opacity-60 ${textSecondary}`}>{prod.brand}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleReactivar(prod.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition-colors"
                              >
                                ⟳ Reactivar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {selectedToDelete.size > 0 && (
                    <div className={`fixed bottom-16 md:bottom-0 left-0 right-0 p-3 md:p-4 ${dark ? "bg-gray-900 border-t border-gray-800" : "bg-white border-t border-gray-200"} shadow-2xl z-40`}>
                      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className={`font-bold text-base md:text-lg text-red-500`}>
                            {selectedToDelete.size} para desactivar
                          </div>
                          <div className={`text-xs md:text-sm ${textSecondary}`}>{selectedUser.name}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={deselectAllToDelete} className={`px-3 md:px-4 py-2 rounded-xl border ${borderColor} ${textSecondary} text-sm`}>
                            Cancelar
                          </button>
                          <button onClick={handleEliminar} disabled={eliminando} className="px-4 md:px-6 py-2 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-red-600 transition-colors text-sm">
                            {eliminando ? <><span className="animate-spin">⟳</span> Desact...</> : "🚫 Desactivar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
