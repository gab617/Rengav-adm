import { useState, useMemo, useEffect } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useAppContext } from "../../../contexto/Context";

export function BulkEditProducts() {
  const { profile, preferencias, actualizarProducto, products: productsContext } = useAppContext();
  const dark = preferencias?.theme === "dark";
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [search, setSearch] = useState("");
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
  const bgMain = dark ? "bg-gray-900" : "bg-gray-50";

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  // Cargar productos del usuario
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
          products_base (id, name, brand_id, brands(name), categories(name)),
          user_custom_products (id, name, brand_id, brand_text, image_url)
        `)
        .eq("user_id", profile?.id);
      
      if (data) {
        const formatted = data.map(p => {
          // Si tiene custom_id, es un producto custom
          const isCustom = p.custom_id !== null;
          return {
            ...p,
            isCustom,
            name: isCustom 
              ? (p.user_custom_products?.name || "Producto custom")
              : (p.products_base?.name || "Sin nombre"),
            brand: isCustom 
              ? (p.user_custom_products?.brand_text || p.user_custom_products?.brands?.name || "Sin marca")
              : (p.products_base?.brands?.name || "Sin marca"),
            category: isCustom ? null : (p.products_base?.categories?.name || "Sin categoría"),
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
  }, [profile?.id]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (filtro === "active") {
      filtered = filtered.filter(p => p.active !== false);
    } else if (filtro === "inactive") {
      filtered = filtered.filter(p => p.active === false);
    }
    
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lower) ||
        p.brand?.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower)
      );
    }
    
    // Ordenar alfabéticamente
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, filtro]);

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
    
    // Validaciones
    const sinStock = Object.values(selectedProducts).filter(p => !p.stock || p.stock === 0).length;
    const sinPrecio = Object.values(selectedProducts).filter(p => !p.precio_venta || p.precio_venta === 0).length;
    
    if (sinStock > 0 || sinPrecio > 0) {
      let warnings = [];
      if (sinStock > 0) warnings.push(`${sinStock} sin stock`);
      if (sinPrecio > 0) warnings.push(`${sinPrecio} sin precio`);
      showNotification(`⚠️ ${warnings.join(", ")}`, "warning");
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
      
      // Actualización optimista + notificar al contexto global
      setProducts(prev => prev.map(p => {
        if (selectedProducts[p.id]) {
          const updated = {
            ...p,
            precio_venta: selectedProducts[p.id].precio_venta,
            precio_compra: selectedProducts[p.id].precio_compra,
            stock: selectedProducts[p.id].stock
          };
          // Notificar al context global
          actualizarProducto(p.id, {
            precio_venta: selectedProducts[p.id].precio_venta,
            precio_compra: selectedProducts[p.id].precio_compra,
            stock: selectedProducts[p.id].stock
          });
          return updated;
        }
        return p;
      }));
      
      showNotification(`¡${Object.keys(selectedProducts).length} productos actualizados!`, "success");
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
    <div className={`min-h-screen ${bgMain} p-4 pb-24`}>
      {notification && (
        <div className={`p-3 rounded-lg text-sm ${
          notification.type === "success" 
            ? "bg-green-500/20 text-green-400" 
            : "bg-red-500/20 text-red-400"
        }`}>
          {notification.msg}
        </div>
      )}

      {/* filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className={`flex gap-1 p-1 rounded-lg ${dark ? "bg-gray-900" : "bg-gray-100"}`}>
          {[
            { id: "all", label: `Todos (${products.length})` },
            { id: "active", label: `Activos (${products.filter(p => p.active !== false).length})` },
            { id: "inactive", label: `Inactivos (${products.filter(p => p.active === false).length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`py-1 px-3 rounded text-xs font-medium transition-all ${
                filtro === f.id
                  ? "bg-blue-500 text-white"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <input
          type="text"
          placeholder="Buscar por nombre o marca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 min-w-32 p-2 rounded-lg border text-sm ${inputBg} ${borderColor}`}
        />
      </div>

      {/* toolbar */}
      {Object.keys(selectedProducts).length > 0 && (
        <div className={`p-3 rounded-lg border ${borderColor} ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-20">
              <label className={`text-xs block mb-1 ${textSecondary}`}>Precio Venta</label>
              <input
                type="number"
                placeholder="$"
                value={precioBaseVenta}
                onChange={(e) => setPrecioBaseVenta(e.target.value)}
                className={`w-full p-2 rounded-lg border text-sm ${inputBg} ${borderColor}`}
              />
            </div>
            <button
              onClick={() => applyBaseToAll("precio_venta", precioBaseVenta)}
              disabled={!precioBaseVenta}
              className="px-2 py-2 bg-purple-500 text-white rounded-lg text-xs disabled:opacity-40"
            >
              Aplicar
            </button>
            
            <div className="flex-1 min-w-20">
              <label className={`text-xs block mb-1 ${textSecondary}`}>Precio Compra</label>
              <input
                type="number"
                placeholder="$"
                value={precioBaseCompra}
                onChange={(e) => setPrecioBaseCompra(e.target.value)}
                className={`w-full p-2 rounded-lg border text-sm ${inputBg} ${borderColor}`}
              />
            </div>
            <button
              onClick={() => applyBaseToAll("precio_compra", precioBaseCompra)}
              disabled={!precioBaseCompra}
              className="px-2 py-2 bg-blue-500 text-white rounded-lg text-xs disabled:opacity-40"
            >
              Aplicar
            </button>

            <div className="flex-1 min-w-20">
              <label className={`text-xs block mb-1 ${textSecondary}`}>Stock</label>
              <input
                type="number"
                placeholder="0"
                value={stockBase}
                onChange={(e) => setStockBase(e.target.value)}
                className={`w-full p-2 rounded-lg border text-sm ${inputBg} ${borderColor}`}
              />
            </div>
            <button
              onClick={() => applyBaseToAll("stock", stockBase)}
              disabled={!stockBase && stockBase !== "0"}
              className="px-2 py-2 bg-green-500 text-white rounded-lg text-xs disabled:opacity-40"
            >
              Aplicar
            </button>

            <button
              onClick={Object.keys(selectedProducts).length === filteredProducts.length ? deselectAll : selectAll}
              className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm"
            >
              {Object.keys(selectedProducts).length === filteredProducts.length ? "Limpiar" : "Todos"}
            </button>
            
            <button 
              onClick={clearValues}
              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
            >
              Limpiar Valores
            </button>
          </div>
        </div>
      )}

      {/* lista */}
      <div className="space-y-2">
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
                    {sinStock && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400" title="Sin stock">
                        📦 0
                      </span>
                    )}
                    {sinPrecio && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400" title="Sin precio">
                        💰 -
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {prod.brand && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                      {prod.brand}
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600"}`}>
                    stock: {prod.stock || 0}
                  </span>
                </div>
              </div>

              {isSelected && (
                <div className="mt-2 pt-2 border-t border-blue-500/30 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${textSecondary}`}>Venta</span>
                    <input
                      type="number"
                      placeholder="$0"
                      value={selectedProducts[prod.id]?.precio_venta ?? ""}
                      onChange={(e) => updatePrecio(prod.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-16 p-1 rounded border text-xs text-right ${inputBg} ${borderColor}`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${textSecondary}`}>Compra</span>
                    <input
                      type="number"
                      placeholder="$0"
                      value={selectedProducts[prod.id]?.precio_compra ?? ""}
                      onChange={(e) => updatePrecioCompra(prod.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-16 p-1 rounded border text-xs text-right ${inputBg} ${borderColor}`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${textSecondary}`}>Stock</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={selectedProducts[prod.id]?.stock ?? ""}
                      onChange={(e) => updateStock(prod.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-12 p-1 rounded border text-xs text-right ${inputBg} ${borderColor}`}
                    />
                  </div>
                  {tieneWarning && (
                    <span className="text-red-500 font-bold text-xs">⚠️</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* footer */}
      {Object.keys(selectedProducts).length > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 p-4 ${dark ? "bg-gray-900 border-t border-gray-800" : "bg-white border-t border-gray-200"} shadow-2xl z-40`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className={`font-bold text-lg ${textPrimary}`}>
                {Object.keys(selectedProducts).length} productos
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={deselectAll} className={`px-4 py-2.5 rounded-xl border ${borderColor} ${textSecondary}`}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-semibold disabled:opacity-50">
                {saving ? "Guardando..." : `Guardar ${Object.keys(selectedProducts).length}`}
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