import React, { useMemo, useState, useRef, useEffect } from "react";
import { useAppContext } from "../../contexto/Context";
import { ListVentas } from "./components/ListVentas";

export function Ventas() {
  const { ventas, loadingVentas, preferencias, products, categorias, subcategorias,
    filtro, fechaSeleccionada, mesSeleccionado, rangoFechas,
    cambiarFiltroRapido, setRangoPersonalizado, setFechaSeleccionada, 
    setMesSeleccionado, fetchVentas, eliminarPorDia, eliminarPorMes, 
    eliminarTodo, eliminarVenta, actualizarProducto } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const [ventaExpandida, setVentaExpandida] = useState(null);
  const [stockFilter, setStockFilter] = useState("alerta");
  const [searchName, setSearchName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [selectedSubcategory, setSelectedSubcategory] = useState("todas");
  const [selectedBrand, setSelectedBrand] = useState("todas");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandRef = useRef(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editedProductData, setEditedProductData] = useState({});
  const [inventoryExpanded, setInventoryExpanded] = useState(false);

  const getProductName = (prod) => prod.products_base?.name || prod.user_custom_products?.name || "Sin nombre";
  const getProductBrand = (prod) => prod.products_base?.brand || prod.products_base?.brand_text || prod.user_custom_products?.brand || "";
  const getProductCategory = (prod) => prod.products_base?.category_id || prod.user_custom_products?.category_id || null;
  const getProductSubcategory = (prod) => prod.products_base?.subcategory_id || prod.user_custom_products?.subcategory_id || null;

  const uniqueBrands = useMemo(() => {
    const brands = new Set();
    products.forEach(p => {
      const brand = getProductBrand(p);
      if (brand) brands.add(brand);
    });
    return Array.from(brands).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [products]);

  const subcategoriasFiltradas = useMemo(() => {
    if (selectedCategory === "todas") return subcategorias;
    return subcategorias.filter(sc => String(sc.id_categoria) === String(selectedCategory));
  }, [subcategorias, selectedCategory]);

  const stockStats = useMemo(() => {
    const sinStock = products.filter(p => p.stock <= 0);
    const critico = products.filter(p => p.stock >= 1 && p.stock <= 2);
    const bajo = products.filter(p => p.stock >= 3 && p.stock <= 5);
    const normal = products.filter(p => p.stock > 5);
    
    const necesitaReposicion = [...sinStock, ...critico].sort((a, b) => a.stock - b.stock);
    
    return {
      sinStock,
      critico,
      bajo,
      normal,
      necesitaReposicion,
      total: products.length
    };
  }, [products]);

  const productosFiltrados = useMemo(() => {
    let base = [];
    switch (stockFilter) {
      case "sin": base = stockStats.sinStock; break;
      case "critico": base = stockStats.critico; break;
      case "bajo": base = stockStats.bajo; break;
      case "normal": base = stockStats.normal; break;
      case "alerta": base = stockStats.necesitaReposicion; break;
      case "todos": base = products; break;
      default: base = stockStats.necesitaReposicion;
    }

    return base.filter(p => {
      const nameMatch = searchName === "" || getProductName(p).toLowerCase().includes(searchName.toLowerCase());
      const categoryMatch = selectedCategory === "todas" || String(getProductCategory(p)) === String(selectedCategory);
      const subcategoryMatch = selectedSubcategory === "todas" || String(getProductSubcategory(p)) === String(selectedSubcategory);
      const brandMatch = selectedBrand === "todas" || getProductBrand(p) === selectedBrand;
      return nameMatch && categoryMatch && subcategoryMatch && brandMatch;
    });
  }, [stockFilter, stockStats, products, searchName, selectedCategory, selectedSubcategory, selectedBrand]);

  const metricas = useMemo(() => {
    const totalVentas = ventas.length;
    const montoTotal = ventas.reduce((acc, v) => acc + (v.monto_total || 0), 0);

    let ganancias = 0;
    ventas.forEach(venta => {
      if (venta.user_sales_detail) {
        venta.user_sales_detail.forEach(detail => {
          const diferencia = (detail.precio_unitario || 0) - (detail.precio_compra || 0);
          ganancias += diferencia * (detail.cantidad || 1);
        });
      }
    });

    const ticketPromedio = totalVentas > 0 ? montoTotal / totalVentas : 0;

    return { totalVentas, montoTotal, ganancias, ticketPromedio };
  }, [ventas]);

  const formatoMoneda = (num) => {
    return num.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const filtroStockButtons = [
    { id: "alerta", label: "Reposición", count: stockStats.necesitaReposicion.length, color: "red" },
    { id: "sin", label: "Sin stock", count: stockStats.sinStock.length, color: "red" },
    { id: "critico", label: "Crítico", count: stockStats.critico.length, color: "orange" },
    { id: "bajo", label: "Bajo", count: stockStats.bajo.length, color: "yellow" },
    { id: "normal", label: "Normal", count: stockStats.normal.length, color: "green" },
    { id: "todos", label: "Todos", count: stockStats.total, color: "gray" },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (brandRef.current && !brandRef.current.contains(e.target)) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters = searchName || selectedCategory !== "todas" || selectedSubcategory !== "todas" || selectedBrand !== "todas";
  
  const clearAllFilters = () => {
    setSearchName("");
    setSelectedCategory("todas");
    setSelectedSubcategory("todas");
    setSelectedBrand("todas");
  };

  const handleEditClick = (prod) => {
    setEditingProduct(prod.id);
    setEditedProductData({
      stock: prod.stock,
      precio_venta: prod.precio_venta,
      precio_compra: prod.precio_compra,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditedProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    const payload = { ...editedProductData };
    if (payload.stock < 0) payload.stock = 0;
    await actualizarProducto(editingProduct, payload);
    setEditingProduct(null);
    setEditedProductData({});
  };

  const handleEditCancel = () => {
    setEditingProduct(null);
    setEditedProductData({});
  };

  const precioVenta = parseFloat(editedProductData.precio_venta) || 0;
  const precioCompra = parseFloat(editedProductData.precio_compra) || 0;
  const ganancia = precioVenta - precioCompra;
  const ventaMenorQueCompra = precioVenta > 0 && precioCompra > 0 && precioCompra > precioVenta;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        dark ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-900"
      } px-3 py-4 md:p-6`}
    >
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`font-bold text-xl md:text-3xl ${
            dark ? "text-blue-400" : "text-blue-600"
          }`}
        >
          📊 Dashboard
        </h1>
        <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-blue-500/30"
              : "bg-white border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🧾</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Tickets hoy
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
            {metricas.totalVentas}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-green-500/30"
              : "bg-white border-green-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Total ventas
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
            ${formatoMoneda(metricas.montoTotal)}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-yellow-500/30"
              : "bg-white border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📈</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Ganancias
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-yellow-400" : "text-yellow-700"}`}>
            ${formatoMoneda(metricas.ganancias)}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-purple-500/30"
              : "bg-white border-purple-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Ticket promedio
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-purple-400" : "text-purple-700"}`}>
            ${formatoMoneda(metricas.ticketPromedio)}
          </span>
        </div>
      </div>

      {/* ALERTAS Y ÚLTIMAS VENTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* INVENTARIO / STOCK */}
        <div
          className={`p-4 rounded-xl border ${
            dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          {/* Header - Clickeable en mobile para colapsar */}
          <div 
            className="flex items-center justify-between mb-0 lg:mb-3 cursor-pointer lg:cursor-default"
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg transition-transform lg:block hidden">📦</span>
              <h2 className={`font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>
                <span className="lg:hidden mr-2">{inventoryExpanded ? "▼" : "▶"}</span>
                📦 Inventario
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {productosFiltrados.length} productos
              </span>
            </div>
          </div>

          {/* Contenido - Colapsable en mobile */}
          <div className={`${!inventoryExpanded ? "hidden lg:block" : ""}`}>
            {/* Espacio extra en mobile cuando está expandido */}
            <div className="h-3 lg:hidden"></div>

          {/* FILTROS DE STOCK */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {filtroStockButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStockFilter(btn.id)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                  stockFilter === btn.id
                    ? btn.color === "red" ? "bg-red-500 text-white" :
                      btn.color === "orange" ? "bg-orange-500 text-white" :
                      btn.color === "yellow" ? "bg-yellow-500 text-black" :
                      btn.color === "green" ? "bg-green-500 text-white" :
                      "bg-blue-500 text-white"
                    : dark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {btn.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  stockFilter === btn.id
                    ? "bg-black/20"
                    : dark ? "bg-gray-600" : "bg-gray-200"
                }`}>
                  {btn.count}
                </span>
              </button>
            ))}
          </div>

          {/* FILTROS ADICIONALES */}
          <div className={`p-3 rounded-lg mb-3 ${dark ? "bg-gray-900/50" : "bg-gray-50"}`}>
            {/* Buscar por nombre */}
            <div className="mb-2">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                  dark 
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              />
            </div>

            {/* Categoría y Subcategoría */}
            <div className="flex gap-2 mb-2">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory("todas");
                }}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${
                  dark 
                    ? "bg-gray-700 border-gray-600 text-white [&>option]:text-white" 
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="todas">Todas las categorías</option>
                {categorias?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                disabled={selectedCategory === "todas"}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${
                  dark 
                    ? "bg-gray-700 border-gray-600 text-white [&>option]:text-white-900" 
                    : "bg-white border-gray-300 text-gray-900"
                } ${selectedCategory === "todas" ? "opacity-50" : ""}`}
              >
                <option value="todas">Todas las subcategorías</option>
                {subcategoriasFiltradas.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.nombre}</option>
                ))}
              </select>
            </div>

            {/* Marca */}
            <div className="relative" ref={brandRef}>
              <div 
                className={`w-full px-3 py-1.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                  dark 
                    ? "bg-gray-700 border-gray-600 text-white" 
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                onClick={() => setShowBrandDropdown(!showBrandDropdown)}
              >
                <span className={selectedBrand === "todas" ? (dark ? "text-gray-400" : "text-gray-500") : ""}>
                  {selectedBrand === "todas" ? "Todas las marcas" : selectedBrand}
                </span>
                <span>{showBrandDropdown ? "▲" : "▼"}</span>
              </div>
              {showBrandDropdown && (
                <div className={`absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-40 overflow-y-auto ${
                  dark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                }`}>
                  <div
                    className={`px-3 py-1.5 cursor-pointer text-xs ${
                      dark ? "text-gray-200 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => { setSelectedBrand("todas"); setShowBrandDropdown(false); }}
                  >
                    Todas las marcas
                  </div>
                  {uniqueBrands.map(brand => (
                    <div
                      key={brand}
                      className={`px-3 py-1.5 cursor-pointer text-xs ${
                        dark ? "text-gray-200 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"
                      } ${selectedBrand === brand ? (dark ? "bg-blue-600/30" : "bg-blue-100") : ""}`}
                      onClick={() => { setSelectedBrand(brand); setShowBrandDropdown(false); }}
                    >
                      {brand}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className={`mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  dark 
                    ? "border-gray-600 text-gray-400 hover:bg-gray-700" 
                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
              >
                🗑️ Limpiar filtros
              </button>
            )}
          </div>

          {/* LISTA DE PRODUCTOS */}
          <div className={`rounded-lg ${dark ? "bg-gray-900/50" : "bg-gray-50"} max-h-64 overflow-y-auto`}>
            {productosFiltrados.length > 0 ? (
              <ul className="divide-y divide-gray-700/30">
                {productosFiltrados.map((prod) => {
                  const stockClass = prod.stock <= 0 ? "text-red-500" :
                                   prod.stock <= 2 ? "text-orange-500" :
                                   prod.stock <= 5 ? "text-yellow-500" :
                                   "text-green-500";
                  const brand = getProductBrand(prod);
                  const isEditing = editingProduct === prod.id;
                  
                  return (
                    <li
                      key={prod.id}
                      className={`p-2 ${dark ? "hover:bg-gray-800/50" : "hover:bg-gray-100"}`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs truncate flex-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                              {getProductName(prod)}
                            </span>
                            <button
                              onClick={handleEditCancel}
                              className={`ml-2 p-1 rounded ${dark ? "hover:bg-gray-600" : "hover:bg-gray-200"}`}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <label className={`block text-[10px] mb-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Stock</label>
                              <input
                                type="number"
                                name="stock"
                                value={editedProductData.stock}
                                onChange={handleEditChange}
                                min="0"
                                className={`w-full px-2 py-1 rounded border text-xs ${
                                  dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className={`block text-[10px] mb-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>P. Venta</label>
                              <input
                                type="number"
                                name="precio_venta"
                                value={editedProductData.precio_venta}
                                onChange={handleEditChange}
                                min="0"
                                className={`w-full px-2 py-1 rounded border text-xs ${
                                  dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className={`block text-[10px] mb-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>P. Compra</label>
                              <input
                                type="number"
                                name="precio_compra"
                                value={editedProductData.precio_compra}
                                onChange={handleEditChange}
                                min="0"
                                className={`w-full px-2 py-1 rounded border text-xs ${
                                  dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                                }`}
                              />
                            </div>
                          </div>
                          {ventaMenorQueCompra && (
                            <p className="text-[10px] text-red-500">⚠️ Ganancia negativa: -${Math.abs(ganancia).toLocaleString()}</p>
                          )}
                          {!ventaMenorQueCompra && precioVenta > 0 && precioCompra > 0 && (
                            <p className="text-[10px] text-green-500">✓ Ganancia: ${ganancia.toLocaleString()}</p>
                          )}
                          <div className="flex gap-1">
                            <button
                              onClick={handleEditSubmit}
                              disabled={ventaMenorQueCompra}
                              className={`flex-1 py-1 rounded text-xs font-medium ${
                                ventaMenorQueCompra
                                  ? dark ? "bg-gray-600 text-gray-400" : "bg-gray-300 text-gray-500"
                                  : dark ? "bg-green-600 hover:bg-green-500 text-white" : "bg-green-500 hover:bg-green-600 text-white"
                              }`}
                            >
                              💾 Guardar
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                dark ? "bg-red-700 hover:bg-red-600 text-white" : "bg-red-600 hover:bg-red-500 text-white"
                              }`}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm truncate block ${dark ? "text-gray-300" : "text-gray-700"}`}>
                              {getProductName(prod)}
                            </span>
                            {brand && (
                              <span className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>
                                {brand}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${stockClass}`}>
                              {prod.stock <= 0 ? "Sin stock" : `${prod.stock} ud`}
                            </span>
                            <button
                              onClick={() => handleEditClick(prod)}
                              className={`p-1.5 rounded transition-colors ${
                                dark ? "hover:bg-blue-600/30 text-blue-400" : "hover:bg-blue-100 text-blue-600"
                              }`}
                              title="Editar"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4 text-center">
                <span className="text-2xl mb-1 block">🔍</span>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  No hay productos con estos filtros
                </p>
              </div>
            )}
          </div>
          </div>
        </div>

          {/* ÚLTIMAS VENTAS */}
        <div
          className={`p-4 rounded-xl border ${
            dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h2 className={`font-bold mb-3 ${dark ? "text-gray-200" : "text-gray-800"}`}>
            🕐 Últimas ventas
          </h2>
          {ventas.length > 0 ? (
            <ul className="space-y-2">
              {ventas.slice(0, 5).map((venta) => {
                const detalles = venta.user_sales_detail || [];
                const cantidadProductos = detalles.reduce((acc, d) => acc + (d.cantidad || 1), 0);
                const estaExpandida = ventaExpandida === venta.id;

                return (
                  <li key={venta.id}>
                    <div
                      onClick={() => setVentaExpandida(estaExpandida ? null : venta.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        dark ? "bg-gray-700/50 hover:bg-gray-600/50" : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`transform transition-transform ${estaExpandida ? "rotate-90" : ""}`}>
                          ▶
                        </span>
                        <div>
                          <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                            {new Date(venta.fecha).toLocaleString("es-AR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className={`text-xs block ${dark ? "text-gray-500" : "text-gray-400"}`}>
                            {cantidadProductos} {cantidadProductos === 1 ? "producto" : "productos"}
                          </span>
                        </div>
                      </div>
                      <span className={`font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                        ${formatoMoneda(venta.monto_total)}
                      </span>
                    </div>

                    {estaExpandida && detalles.length > 0 && (
                      <ul className={`mt-2 ml-6 space-y-1 p-2 rounded-lg ${dark ? "bg-gray-900/50" : "bg-white"}`}>
                        {detalles.map((detalle, idx) => (
                          <li key={idx} className={`flex justify-between text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
                            <span className="truncate flex-1 mr-2">
                              {detalle.nombre_producto}
                            </span>
                            <span className="shrink-0">
                              x{detalle.cantidad} · ${formatoMoneda(detalle.precio_unitario * detalle.cantidad)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
              No hay ventas registradas
            </p>
          )}
        </div>
      </div>

      {/* HISTORIAL COMPLETO */}
      <h2
        className={`font-bold mb-4 ${dark ? "text-gray-200" : "text-gray-800"}`}
      >
        📋 Historial de Ventas
      </h2>
      <div className="flex w-full">
        <ListVentas
          ventas={ventas}
          dark={dark}
          loadingVentas={loadingVentas}
          fetchVentas={fetchVentas}
          eliminarVenta={eliminarVenta}
          filtro={filtro}
          fechaSeleccionada={fechaSeleccionada}
          mesSeleccionado={mesSeleccionado}
          rangoFechas={rangoFechas}
          cambiarFiltroRapido={cambiarFiltroRapido}
          setRangoPersonalizado={setRangoPersonalizado}
          setFechaSeleccionada={setFechaSeleccionada}
          setMesSeleccionado={setMesSeleccionado}
          eliminarPorDia={eliminarPorDia}
          eliminarPorMes={eliminarPorMes}
          eliminarTodo={eliminarTodo}
        />
      </div>
    </div>
  );
}
