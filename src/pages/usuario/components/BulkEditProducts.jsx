import { useState, useMemo, useEffect } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useAppContext } from "../../../contexto/Context";
import { IconCheck, IconWarning, IconPackage } from "../../../components/icons";

export function BulkEditProducts() {
  const { profile, preferencias, actualizarProducto, categorias, subcategorias, unifiedBrands } = useAppContext();
  const dark = preferencias?.theme === "dark";
  
  const brandsMap = useMemo(() => {
    const map = {};
    (unifiedBrands || []).forEach(b => {
      if (b.brand_id) {
        map[b.brand_id] = b.label || b.name;
      }
    });
    return map;
  }, [unifiedBrands]);
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [subcategoriaActiva, setSubcategoriaActiva] = useState("todas");
  const [precioBaseVenta, setPrecioBaseVenta] = useState("");
  const [precioBaseCompra, setPrecioBaseCompra] = useState("");
  const [stockBase, setStockBase] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [filtro, setFiltro] = useState("all");

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const baseCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";
  const tabInactiveClass = dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900";

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const { data } = await supabase
        .from("user_products")
        .select(`
          id,
          active,
          precio_venta,
          precio_compra,
          stock,
          custom_id,
          products_base (id, name, brand_id, brand, category_id, subcategory_id, image_url, categories(id, name), subcategories(id, name)),
          user_custom_products (id, name, brand_id, brand_text, image_url)
        `)
        .eq("user_id", profile?.id);
      
      if (data) {
        const formatted = data.map(p => {
          const isCustom = p.custom_id !== null;
          let brandName = "Sin marca";
          if (isCustom) {
            brandName = p.user_custom_products?.brand_text || brandsMap[p.user_custom_products?.brand_id] || "Sin marca";
          } else {
            brandName = p.products_base?.brand || brandsMap[p.products_base?.brand_id] || "Sin marca";
          }
          return {
            ...p,
            isCustom,
            name: isCustom 
              ? (p.user_custom_products?.name || "Producto custom")
              : (p.products_base?.name || "Sin nombre"),
            brand: brandName,
            category: isCustom ? null : (p.products_base?.categories?.name || "Sin categoría"),
            category_id: isCustom ? null : (p.products_base?.category_id || null),
            subcategory_id: isCustom ? null : (p.products_base?.subcategory_id || null),
            image_url: isCustom ? p.user_custom_products?.image_url : p.products_base?.image_url
          };
        });
        setProducts(formatted);
      }
      setLoading(false);
    }
    
    if (profile?.id) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const subcategoriasDeCategoria = useMemo(() => {
    if (categoriaActiva === "todas") return [];
    const subs = subcategorias || [];
    return subs.filter(s => s.id_categoria === categoriaActiva);
  }, [categoriaActiva, subcategorias]);

  const conteoPorCategoria = useMemo(() => {
    const counts = { todas: products.length };
    products.forEach(p => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const conteoPorSubcategoria = useMemo(() => {
    if (categoriaActiva === "todas") return {};
    const counts = { todas: conteoPorCategoria[categoriaActiva] || 0 };
    products
      .filter(p => p.category_id === categoriaActiva)
      .forEach(p => {
        if (p.subcategory_id) {
          counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1;
        }
      });
    return counts;
  }, [products, categoriaActiva, conteoPorCategoria]);

  const categoriasConProductos = useMemo(() => {
    const catIds = new Set(products.map(p => p.category_id).filter(Boolean));
    const cats = categorias || [];
    const filtered = cats.filter(c => catIds.has(c.id));
    if (filtered.length === 0 && products.length > 0) {
      return cats.length > 0 ? cats : [];
    }
    return filtered;
  }, [categorias, products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (filtro === "active") {
      filtered = filtered.filter(p => p.active !== false);
    } else if (filtro === "inactive") {
      filtered = filtered.filter(p => p.active === false);
    }
    
    if (categoriaActiva !== "todas") {
      filtered = filtered.filter(p => p.category_id === categoriaActiva);
    }

    if (subcategoriaActiva !== "todas" && subcategoriaActiva !== null) {
      filtered = filtered.filter(p => p.subcategory_id === subcategoriaActiva);
    }
    
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lower) ||
        p.brand?.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower)
      );
    }
    
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, filtro, categoriaActiva, subcategoriaActiva]);

  const toggleProduct = (id) => {
    if (selectedProducts[id]) {
      const newSelected = { ...selectedProducts };
      delete newSelected[id];
      setSelectedProducts(newSelected);
    } else {
      const product = products.find(p => p.id === id);
      setSelectedProducts(prev => ({
        ...prev,
        [id]: {
          precio_venta: product?.precio_venta || 0,
          precio_compra: product?.precio_compra || 0,
          stock: product?.stock || 0
        }
      }));
    }
  };

  const updatePrecio = (id, value) => {
    setSelectedProducts(prev => ({
      ...prev,
      [id]: { ...prev[id], precio_venta: parseFloat(value) || 0 }
    }));
  };

  const updatePrecioCompra = (id, value) => {
    setSelectedProducts(prev => ({
      ...prev,
      [id]: { ...prev[id], precio_compra: parseFloat(value) || 0 }
    }));
  };

  const updateStock = (id, value) => {
    setSelectedProducts(prev => ({
      ...prev,
      [id]: { ...prev[id], stock: parseInt(value) || 0 }
    }));
  };

  const applyBaseToAll = (field, value) => {
    if (!value && field !== "stock") return;
    const val = field === "stock" ? parseInt(value) || 0 : parseFloat(value) || 0;
    const updated = {};
    Object.keys(selectedProducts).forEach(id => {
      updated[id] = { ...selectedProducts[id], [field]: val };
    });
    setSelectedProducts(updated);
  };

  const selectAll = () => {
    const all = {};
    filteredProducts.forEach(p => {
      all[p.id] = {
        precio_venta: p.precio_venta || 0,
        precio_compra: p.precio_compra || 0,
        stock: p.stock || 0
      };
    });
    setSelectedProducts(all);
  };

  const deselectAll = () => setSelectedProducts({});

  const clearValues = () => {
    const cleared = {};
    Object.keys(selectedProducts).forEach(id => {
      cleared[id] = { precio_venta: 0, precio_compra: 0, stock: 0 };
    });
    setSelectedProducts(cleared);
  };

  const handleSave = async () => {
    if (Object.keys(selectedProducts).length === 0) return;
    
    const sinStock = Object.values(selectedProducts).filter(p => !p.stock || p.stock === 0).length;
    const sinPrecio = Object.values(selectedProducts).filter(p => !p.precio_venta || p.precio_venta === 0).length;
    
    if (sinStock > 0 || sinPrecio > 0) {
      let warnings = [];
      if (sinStock > 0) warnings.push(`${sinStock} sin stock`);
      if (sinPrecio > 0) warnings.push(`${sinPrecio} sin precio`);
      showNotification(warnings.join(", "), "warning");
    }
    
    setSaving(true);
    try {
      const updates = Object.entries(selectedProducts).map(([id, data]) =>
        supabase
          .from("user_products")
          .update({
            precio_venta: data.precio_venta,
            precio_compra: data.precio_compra,
            stock: data.stock
          })
          .eq("id", id)
      );
      
      await Promise.all(updates);
      
      setProducts(prev => prev.map(p => {
        if (selectedProducts[p.id]) {
          const updated = {
            ...p,
            precio_venta: selectedProducts[p.id].precio_venta,
            precio_compra: selectedProducts[p.id].precio_compra,
            stock: selectedProducts[p.id].stock
          };
          actualizarProducto(p.id, {
            precio_venta: selectedProducts[p.id].precio_venta,
            precio_compra: selectedProducts[p.id].precio_compra,
            stock: selectedProducts[p.id].stock
          });
          return updated;
        }
        return p;
      }));
      
      showNotification(`${Object.keys(selectedProducts).length} productos actualizados`, "success");
      setSelectedProducts({});
    } catch (err) {
      console.error(err);
      showNotification("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 text-center ${textSecondary}`}>
        <span className="animate-pulse">Cargando productos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {/* NOTIFICACIÓN */}
      {notification && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
          notification.type === "success"
            ? "bg-green-500/15 text-green-400"
            : notification.type === "warning"
            ? "bg-yellow-500/15 text-yellow-400"
            : "bg-red-500/15 text-red-400"
        }`}>
          {notification.type === "success"
            ? <IconCheck className="w-4 h-4 shrink-0" />
            : <IconWarning className="w-4 h-4 shrink-0" />
          }
          <span>{notification.msg}</span>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className={`flex gap-1 p-1 rounded-xl shrink-0 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          {[
            { id: "all", label: `Todos (${products.length})` },
            { id: "active", label: `Activos (${products.filter(p => p.active !== false).length})` },
            { id: "inactive", label: `Inactivos (${products.filter(p => p.active === false).length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
                filtro === f.id
                  ? "bg-blue-500 text-white shadow"
                  : tabInactiveClass
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 min-w-32 p-2 rounded-xl border text-sm ${inputBg} ${borderColor}`}
        />
      </div>

      {/* CATEGORÍAS */}
      {categoriasConProductos.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => { setCategoriaActiva("todas"); setSubcategoriaActiva("todas"); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              categoriaActiva === "todas"
                ? "bg-blue-500 text-white shadow"
                : dark ? "bg-gray-700/60 text-gray-300" : "bg-gray-100 text-gray-600"
            }`}
          >
            Todas ({conteoPorCategoria.todas})
          </button>
          {categoriasConProductos.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setCategoriaActiva(cat.id); setSubcategoriaActiva("todas"); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                categoriaActiva === cat.id
                  ? "text-white shadow"
                  : dark ? "bg-gray-700/60 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}
              style={categoriaActiva === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.nombre} ({conteoPorCategoria[cat.id] || 0})
            </button>
          ))}
        </div>
      )}

      {/* SUBCATEGORÍAS */}
      {categoriaActiva !== "todas" && subcategoriasDeCategoria.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSubcategoriaActiva("todas")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              subcategoriaActiva === "todas"
                ? "bg-blue-500 text-white shadow"
                : dark ? "bg-gray-600/60 text-gray-400" : "bg-gray-200 text-gray-500"
            }`}
          >
            Todas ({conteoPorSubcategoria.todas})
          </button>
          {subcategoriasDeCategoria.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSubcategoriaActiva(sub.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                subcategoriaActiva === sub.id
                  ? "bg-blue-500 text-white shadow"
                  : dark ? "bg-gray-600/60 text-gray-400" : "bg-gray-200 text-gray-500"
              }`}
            >
              {sub.nombre} ({conteoPorSubcategoria[sub.id] || 0})
            </button>
          ))}
        </div>
      )}

      {/* TOOLBAR ASIGNACIONES COLECTIVAS */}
      {Object.keys(selectedProducts).length > 0 && (
        <div className={`p-2.5 rounded-xl border ${borderColor} ${dark ? "bg-gray-800/70" : "bg-gray-50/80"}`}>
          <div className="flex flex-col sm:grid sm:grid-cols-3 sm:gap-2 gap-2">
            {[
              { field: "precio_venta", label: "Venta", placeholder: "$", state: precioBaseVenta, set: setPrecioBaseVenta, colorClass: "bg-purple-500" },
              { field: "precio_compra", label: "Compra", placeholder: "$", state: precioBaseCompra, set: setPrecioBaseCompra, colorClass: "bg-blue-500" },
              { field: "stock", label: "Stock", placeholder: "0", state: stockBase, set: setStockBase, colorClass: "bg-green-500" },
            ].map(({ field, label, placeholder, state, set, colorClass }) => (
              <div key={field} className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:gap-0.5">
                <label className={`w-14 sm:w-auto shrink-0 text-[10px] sm:text-xs ${textSecondary}`}>{label}</label>
                <div className="flex-1 flex gap-1">
                  <input
                    type="number"
                    placeholder={placeholder}
                    value={state || ""}
                    onChange={(e) => set(e.target.value)}
                    className={`flex-1 min-w-0 p-1.5 sm:p-2 rounded-lg border text-xs sm:text-sm ${inputBg} ${borderColor}`}
                  />
                  <button
                    onClick={() => applyBaseToAll(field, state)}
                    disabled={!state && !(field === "stock" && state !== "0")}
                    className={`px-2 py-1.5 text-white rounded-lg text-xs disabled:opacity-40 sm:hidden flex items-center justify-center shrink-0 ${colorClass}`}
                  >
                    <IconCheck className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => applyBaseToAll("precio_venta", precioBaseVenta)}
              disabled={!precioBaseVenta}
              className="hidden sm:flex px-3 py-2 bg-purple-500 text-white rounded-lg text-xs disabled:opacity-40 items-center justify-center gap-1"
            >
              <IconCheck className="w-3.5 h-3.5" /> Aplicar
            </button>
            <button
              onClick={() => applyBaseToAll("precio_compra", precioBaseCompra)}
              disabled={!precioBaseCompra}
              className="hidden sm:flex px-3 py-2 bg-blue-500 text-white rounded-lg text-xs disabled:opacity-40 items-center justify-center gap-1"
            >
              <IconCheck className="w-3.5 h-3.5" /> Aplicar
            </button>
            <button
              onClick={() => applyBaseToAll("stock", stockBase)}
              disabled={!stockBase && stockBase !== "0"}
              className="hidden sm:flex px-3 py-2 bg-green-500 text-white rounded-lg text-xs disabled:opacity-40 items-center justify-center gap-1"
            >
              <IconCheck className="w-3.5 h-3.5" /> Aplicar
            </button>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={Object.keys(selectedProducts).length === filteredProducts.length ? deselectAll : selectAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {Object.keys(selectedProducts).length === filteredProducts.length ? "Limpiar" : "Todos"}
            </button>
            <button
              onClick={clearValues}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dark ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-red-50 text-red-500 hover:bg-red-100"
              }`}
            >
              Limpiar Valores
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="space-y-1.5">
        {filteredProducts.map((prod) => {
          const isSelected = !!selectedProducts[prod.id];
          const tieneWarning = selectedProducts[prod.id]?.precio_venta > 0 && 
                               selectedProducts[prod.id]?.precio_compra > 0 && 
                               selectedProducts[prod.id].precio_venta < selectedProducts[prod.id].precio_compra;
          const sinStock = prod.stock === 0 || prod.stock === null || prod.stock === undefined;
          const sinPrecio = !prod.precio_venta || prod.precio_venta === 0;
          
          return (
            <div
              key={prod.id}
              onClick={() => toggleProduct(prod.id)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                isSelected 
                  ? `border-blue-500 bg-blue-500/10 ${tieneWarning ? "ring-2 ring-red-500" : ""}` 
                  : `${baseCard} hover:border-blue-400`
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isSelected && (
                  <div className="w-5 h-5 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                    <IconCheck className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <p className={`font-medium text-sm ${textPrimary}`}>{prod.name}</p>
                    {sinStock && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-red-500/15 text-red-400" title="Sin stock">
                        <IconPackage className="w-3 h-3" /> 0
                      </span>
                    )}
                    {sinPrecio && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-yellow-500/15 text-yellow-400" title="Sin precio">
                        <IconWarning className="w-3 h-3" /> Sin precio
                      </span>
                    )}
                    {prod.type_unit === "weight" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/15 text-emerald-400" title="Por peso">
                        Peso
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {prod.brand && (
                      <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md ${dark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                        {prod.brand}
                      </span>
                    )}
                    {prod.category && (
                      <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md ${dark ? "bg-purple-500/15 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                        {prod.category}
                      </span>
                    )}
                    <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md ${dark ? "bg-green-500/15 text-green-400" : "bg-green-50 text-green-600"}`}>
                      Stock: {prod.stock || 0}
                    </span>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="mt-2 pt-2 border-t border-blue-500/30 grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="flex flex-col">
                    <span className={`text-[10px] ${textSecondary}`}>Venta</span>
                    <input
                      type="number"
                      placeholder="$0"
                      value={selectedProducts[prod.id]?.precio_venta || ""}
                      onChange={(e) => updatePrecio(prod.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`min-w-0 p-1.5 rounded-lg border text-xs text-right ${inputBg} ${borderColor}`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] ${textSecondary}`}>Compra</span>
                    <input
                      type="number"
                      placeholder="$0"
                      value={selectedProducts[prod.id]?.precio_compra || ""}
                      onChange={(e) => updatePrecioCompra(prod.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`min-w-0 p-1.5 rounded-lg border text-xs text-right ${inputBg} ${borderColor}`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] ${textSecondary}`}>Stock</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={selectedProducts[prod.id]?.stock || ""}
                      onChange={(e) => updateStock(prod.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`min-w-0 p-1.5 rounded-lg border text-xs text-right ${inputBg} ${borderColor}`}
                    />
                  </div>
                  {tieneWarning && (
                    <div className="col-span-3 flex items-center gap-1 text-red-400 text-xs font-medium">
                      <IconWarning className="w-3.5 h-3.5" /> Precio venta menor al de compra
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER FIJO */}
      {Object.keys(selectedProducts).length > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 px-3 py-2.5 ${dark ? "bg-gray-900/95 border-t border-gray-800" : "bg-white/95 border-t border-gray-200"} backdrop-blur-md shadow-2xl z-40`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                {Object.keys(selectedProducts).length}
              </span>
              <span className={`text-xs font-medium ${textSecondary}`}>seleccionados</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={deselectAll}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${borderColor} ${textSecondary} hover:opacity-80`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 hover:from-green-400 hover:to-emerald-500 transition-all"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Guardando
                  </>
                ) : (
                  <>
                    <IconCheck className="w-3.5 h-3.5" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className={`text-center py-12 ${textSecondary}`}>
          <p>No hay productos disponibles</p>
        </div>
      )}
    </div>
  );
}