import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import { useAuth } from "../../../contexto/AuthContext";
import { useProductosSistema } from "../../../hooksSB/useProductosSistema";

export function AgregarProductosSistema({ onClose }) {
  const { user } = useAuth();
  const { preferencias, categorias, subcategorias, products, agregarProductoBase } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [loaded, setLoaded] = useState(false);

  const {
    productosSistema,
    productosInactivos,
    assignedProducts,
    loading,
    fetchProductosSistema,
    agregarProductosBulk,
  } = useProductosSistema(user?.id, categorias, products);

  useEffect(() => {
    if (!loaded && user?.id) {
      fetchProductosSistema();
      setLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Map de productos asignados ACTIVOS con su info
  const productosAsignadosMap = useMemo(() => {
    const map = {};
    products.forEach(p => {
      if (p.base_id) {
        map[p.base_id] = p;
      }
    });
    return map;
  }, [products]);

  // Set de productos INACTIVOS (del servidor)
  const productosInactivosSet = useMemo(() => {
    return new Set(productosInactivos || []);
  }, [productosInactivos]);

  // Separar productos en dos listas (disponibles + asignados)
  // Los productos INACTIVOS van a "ya agregados", NO a disponibles
  const { productosDisponibles, productosAsignados } = useMemo(() => {
    const disponibles = [];
    const asignados = [];
    const seenBaseIds = new Set();

    // Productos del sistema
    productosSistema.forEach(p => {
      const infoUsuario = productosAsignadosMap[p.id];
      const isInactive = productosInactivosSet.has(p.id);

      seenBaseIds.add(p.id);

      // Si tiene infoUsuario (activo) o está en inactivos, va a "ya agregados"
      if (infoUsuario || isInactive) {
        asignados.push({
          ...p,
          infoUsuario: infoUsuario || null,
          isInactive,
        });
      } else {
        // Si NO está asignado (ni activo ni inactivo), va a "disponibles"
        disponibles.push(p);
      }
    });

    // Productos recién agregados en esta sesión (actualización instantánea)
    assignedProducts.forEach(p => {
      if (!seenBaseIds.has(p.base_id)) {
        seenBaseIds.add(p.base_id);
        // Los recién agregados van a ambas listas
        disponibles.push({
          id: p.base_id,
          name: p.products_base?.name,
          brand_name: p.products_base?.brand,
          category_id: p.products_base?.category_id,
          subcategory_id: p.products_base?.subcategory_id,
          infoUsuario: p,
          isInactive: false,
        });
      }
      // También agregar a asignados
      if (!asignados.some(a => a.id === p.base_id)) {
        asignados.push({
          id: p.base_id,
          name: p.products_base?.name,
          brand_name: p.products_base?.brand,
          category_id: p.products_base?.category_id,
          subcategory_id: p.products_base?.subcategory_id,
          infoUsuario: p,
          isInactive: false,
        });
      }
    });

    return { 
      productosDisponibles: disponibles.sort((a, b) => (a.name || "").localeCompare(b.name || "")), 
      productosAsignados: asignados.sort((a, b) => (a.name || "").localeCompare(b.name || "")) 
    };
  }, [productosSistema, assignedProducts, productosAsignadosMap, productosInactivosSet]);

  // Estado
  const [activeTab, setActiveTab] = useState("disponibles");
  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [subcategoriaActiva, setSubcategoriaActiva] = useState("todas");
  const [showHistorial, setShowHistorial] = useState(false);
  
  // Selección múltiple (mapa para permitir inputs individuales)
  const [selectedProductsMap, setSelectedProductsMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Historial de productos agregados
  const [historialAgregados, setHistorialAgregados] = useState([]);
  
  // Formulario para un solo producto
  const [formSingle, setFormSingle] = useState({
    precio_compra: "",
    precio_venta: "",
    stock: "",
    descripcion: "",
  });
  
  // Bulk inputs
  const [bulkPrecioVenta, setBulkPrecioVenta] = useState("");
  const [bulkPrecioCompra, setBulkPrecioCompra] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  
  // Subcategorías de la categoría seleccionada
  const subcategoriasDeCategoria = useMemo(() => {
    if (categoriaActiva === "todas") return [];
    return subcategorias.filter(s => s.id_categoria === categoriaActiva);
  }, [categoriaActiva, subcategorias]);

  // Filtrar productos según la pestaña activa
  // La pestaña "disponibles" SOLO muestra productos NO asignados
  // La pestaña "asignados" muestra productos YA agregados
  const productosFiltrados = useMemo(() => {
    let source;

    if (activeTab === "disponibles") {
      // Solo productos NO asignados al usuario
      source = productosDisponibles;
    } else {
      // Productos YA asignados
      source = productosAsignados;
    }

    let result = source;

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.brand_name?.toLowerCase().includes(term)
      );
    }

    if (categoriaActiva !== "todas") {
      result = result.filter(p => p.category_id === categoriaActiva);
    }

    if (subcategoriaActiva !== "todas" && subcategoriaActiva !== null) {
      result = result.filter(p => p.subcategory_id === subcategoriaActiva);
    }

    return result;
  }, [activeTab, productosDisponibles, productosAsignados, search, categoriaActiva, subcategoriaActiva]);

  // Contadores por categoría (solo para productos NO asignados)
  const conteoPorCategoria = useMemo(() => {
    const counts = { todas: productosDisponibles.length };
    productosDisponibles.forEach(p => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [productosDisponibles]);

  // Contadores por subcategoría (solo para productos NO asignados)
  const conteoPorSubcategoria = useMemo(() => {
    if (categoriaActiva === "todas") return {};
    const counts = { todas: conteoPorCategoria[categoriaActiva] || 0 };
    productosDisponibles
      .filter(p => p.category_id === categoriaActiva)
      .forEach(p => {
        if (p.subcategory_id) {
          counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1;
        }
      });
    return counts;
  }, [productosDisponibles, categoriaActiva, conteoPorCategoria]);

  // Categorías con productos NO asignados
  const categoriasConProductos = useMemo(() => {
    const catIds = new Set(productosDisponibles.map(p => p.category_id).filter(Boolean));
    return categorias.filter(c => catIds.has(c.id));
  }, [categorias, productosDisponibles]);

  // Toggle selección de producto (clic en toda la card)
  const toggleProductSelection = (producto) => {
    setSelectedProductsMap(prev => {
      if (prev[producto.id]) {
        const newMap = { ...prev };
        delete newMap[producto.id];
        return newMap;
      }
      return {
        ...prev,
        [producto.id]: {
          producto,
          precio_compra: formSingle.precio_compra || "",
          precio_venta: formSingle.precio_venta || "",
          stock: formSingle.stock || "",
          descripcion: formSingle.descripcion || "",
        }
      };
    });
  };

  // Actualizar valor de un producto específico
  const updateProductValue = (productoId, field, value) => {
    setSelectedProductsMap(prev => ({
      ...prev,
      [productoId]: {
        ...prev[productoId],
        [field]: value
      }
    }));
  };

  // Aplicar valor a todos los productos seleccionados
  const applyBulkToAll = (field, value) => {
    setSelectedProductsMap(prev => {
      const updated = {};
      Object.keys(prev).forEach(id => {
        updated[id] = { ...prev[id], [field]: value };
      });
      return updated;
    });
  };

  // Toggle seleccionar todos
  const toggleSelectAll = () => {
    const source = productosDisponibles;
    const currentCount = Object.keys(selectedProductsMap).length;
    
    if (currentCount === source.length) {
      setSelectedProductsMap({});
    } else {
      const newMap = {};
      source.forEach(p => {
        newMap[p.id] = {
          producto: p,
          precio_compra: formSingle.precio_compra || "",
          precio_venta: formSingle.precio_venta || "",
          stock: formSingle.stock || "",
          descripcion: formSingle.descripcion || "",
        };
      });
      setSelectedProductsMap(newMap);
    }
  };

  // Obtener array de productos seleccionados (para operaciones)
  const getSelectedProductsArray = () => {
    return Object.values(selectedProductsMap)
      .filter(item => item.producto?.id) // Filter out any items without valid product
      .map(item => ({
        ...item.producto,
        data: {
          precio_compra: parseFloat(item.precio_compra) || 0,
          precio_venta: parseFloat(item.precio_venta) || 0,
          stock: parseInt(item.stock) || 0,
          descripcion: item.descripcion || null,
        }
      }));
  };

  // Agregar productos con datos específicos (uno o múltiplos)
  const handleAgregar = async () => {
    const productosArray = getSelectedProductsArray();
    if (productosArray.length === 0) return;
    
    // Validar ganancia negativa
    for (const item of productosArray) {
      const pc = item.data.precio_compra;
      const pv = item.data.precio_venta;
      if (pc > 0 && pv > 0 && pc > pv) {
        const confirmacion = confirm(
          `⚠️ Ganancia negativa en "${item.name}"\n\n` +
          `Precio Compra: $${pc.toLocaleString()}\n` +
          `Precio Venta: $${pv.toLocaleString()}\n` +
          `Ganancia por unidad: -$${(pc - pv).toLocaleString()}\n\n` +
          `¿Deseas continuar de todos modos?`
        );
        if (!confirmacion) return;
        break;
      }
    }
    
    setSubmitting(true);

    const productosParaHook = productosArray.map(p => p.producto || p);
    const datosComunes = productosArray[0]?.data;
    
    const result = await agregarProductosBulk(
      productosParaHook,
      datosComunes || {}
    );

    setSubmitting(false);

    if (result.success && result.productos.length > 0) {
      // Agregar al historial
      productosArray.forEach(p => {
        const datosProducto = {
          id: Date.now() + Math.random(),
          nombre: p.name,
          brand_name: p.brand_name,
          precio_compra: p.data.precio_compra,
          precio_venta: p.data.precio_venta,
          stock: p.data.stock,
          fecha: new Date().toLocaleString("es-AR"),
        };
        setHistorialAgregados(prev => [datosProducto, ...prev].slice(0, 10));
      });
      
      result.productos.forEach(p => agregarProductoBase(p));
      setSelectedProductsMap({});
      setFormSingle({ precio_compra: "", precio_venta: "", stock: "", descripcion: "" });
      alert(`✅ ${result.productos.length} producto(s) agregado(s)`);
    } else {
      alert(result.error || "Error al agregar");
    }
  };

  // Agregar MÚLTIPLES productos sin datos (bulk simple)
  const handleAgregarBulkSimple = async () => {
    const productosArray = getSelectedProductsArray();
    if (productosArray.length < 1) return;
    
    setSubmitting(true);

    const productosParaHook = productosArray.map(p => p.producto || p);
    
    const result = await agregarProductosBulk(productosParaHook, {});

    setSubmitting(false);

    if (result.success && result.productos.length > 0) {
      result.productos.forEach(p => agregarProductoBase(p));
      setSelectedProductsMap({});
      alert(`✅ ${result.productos.length} productos agregados`);
    } else {
      alert(result.error || "Error al agregar");
    }
  };

  const handleSelectCategoria = (catId) => {
    setCategoriaActiva(catId);
    setSubcategoriaActiva("todas");
  };

  // Estilos
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgModal = dark ? "bg-gray-900" : "bg-gray-50";
  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900";

  const selectedCount = Object.keys(selectedProductsMap).length;
  const isSingleSelection = selectedCount === 1;
  const isMultiSelection = selectedCount >= 2;

  // Check if any product has data filled in
  const hasAnyData = Object.values(selectedProductsMap).some(p => 
    p.precio_compra || p.precio_venta || p.stock
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-4xl h-[90vh] md:h-[85vh] rounded-2xl ${bgModal} flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className={`p-4 flex items-center justify-between border-b ${borderColor}`}>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary}`}>
              📦 Productos del Sistema
            </h2>
            <p className={`text-sm ${textSecondary}`}>
              {loading ? "Cargando..." : `${productosDisponibles.length} disponibles • ${productosAsignados.length} agregados`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {historialAgregados.length > 0 && (
              <button
                onClick={() => setShowHistorial(!showHistorial)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${dark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
              >
                📋 {historialAgregados.length}
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl ${dark ? "hover:bg-gray-500 text-white" : "hover:bg-gray-200"}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* HISTORIAL COLAPSABLE */}
        {showHistorial && historialAgregados.length > 0 && (
          <div className={`px-4 py-3 border-b ${dark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}>
            <h3 className={`text-xs font-bold mb-2 ${dark ? "text-blue-400" : "text-blue-600"}`}>
              📋 Últimos agregados
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {historialAgregados.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs ${dark ? "bg-gray-800" : "bg-white border border-gray-200"}`}
                >
                  <p className={`font-medium truncate max-w-[120px] ${textPrimary}`}>{item.nombre}</p>
                  <p className={`${dark ? "text-gray-400" : "text-gray-500"}`}>
                    C:${item.precio_compra || 0} V:${item.precio_venta || 0}
                  </p>
                  <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    {item.fecha}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABS */}
        <div className={`px-4 py-2 border-b ${borderColor}`}>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab("disponibles");
                setSelectedProductsMap({});
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === "disponibles"
                  ? dark
                    ? "bg-green-500/20 text-green-400"
                    : "bg-green-100 text-green-600"
                  : dark
                  ? "bg-gray-700 text-gray-400"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span>📦</span>
              Disponibles
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${dark ? "bg-gray-600" : "bg-gray-200"}`}>
                {productosDisponibles.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("asignados");
                setSelectedProductsMap({});
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === "asignados"
                  ? dark
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-100 text-blue-600"
                  : dark
                  ? "bg-gray-700 text-gray-400"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span>✅</span>
              Ya Agregados
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${dark ? "bg-gray-600" : "bg-gray-200"}`}>
                {productosAsignados.length}
              </span>
            </button>
          </div>
        </div>

        {/* BARRA DE ACCIÓN - Solo visible en desktop */}
        {activeTab === "disponibles" && selectedCount > 0 && !esMobile && (
          <div className={`px-4 py-2 border-b ${borderColor} ${dark ? "bg-green-500/10" : "bg-green-50"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${textPrimary}`}>
                {isSingleSelection && (
                  <span>📝 1 producto seleccionado - Editar datos</span>
                )}
                {isMultiSelection && (
                  <span>📋 {selectedCount} productos seleccionados - Carga masiva</span>
                )}
              </span>
              <button
                onClick={() => { setSelectedProductsMap({}); }}
                className={`px-3 py-1 rounded-lg text-sm ${dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
              >
                ✕ Cancelar
              </button>
            </div>
            
            {/* Bulk inputs */}
            {isMultiSelection && (
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Venta"
                    value={bulkPrecioVenta}
                    onChange={(e) => setBulkPrecioVenta(e.target.value)}
                    className={`w-16 px-2 py-1 rounded border text-xs ${inputBg} ${borderColor}`}
                  />
                  <button
                    onClick={() => applyBulkToAll("precio_venta", bulkPrecioVenta)}
                    disabled={!bulkPrecioVenta}
                    className="px-1.5 py-1 bg-purple-500 text-white rounded text-xs disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Compra"
                    value={bulkPrecioCompra}
                    onChange={(e) => setBulkPrecioCompra(e.target.value)}
                    className={`w-16 px-2 py-1 rounded border text-xs ${inputBg} ${borderColor}`}
                  />
                  <button
                    onClick={() => applyBulkToAll("precio_compra", bulkPrecioCompra)}
                    disabled={!bulkPrecioCompra}
                    className="px-1.5 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Stock"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className={`w-12 px-2 py-1 rounded border text-xs ${inputBg} ${borderColor}`}
                  />
                  <button
                    onClick={() => applyBulkToAll("stock", bulkStock)}
                    disabled={!bulkStock && bulkStock !== "0"}
                    className="px-1.5 py-1 bg-green-500 text-white rounded text-xs disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
                <button
                  onClick={() => setSelectedProductsMap({})}
                  className={`px-2 py-1 rounded text-xs ${dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500"}`}
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* LISTA DE PRODUCTOS */}
          <div className={`flex-1 overflow-y-auto p-2 sm:p-4 ${borderColor} md:border-r ${selectedCount > 0 && esMobile ? "pb-28" : ""}`}>
            {/* BÚSQUEDA */}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-9 py-2.5 rounded-xl border ${inputBg} text-sm`}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary}`}
                >
                  ✕
                </button>
              )}
            </div>

            {/* CATEGORÍAS */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
              <button
                onClick={() => handleSelectCategoria("todas")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  categoriaActiva === "todas"
                    ? "bg-blue-500 text-white"
                    : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                }`}
              >
                Todas ({conteoPorCategoria.todas})
              </button>
              {categoriasConProductos.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategoria(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    categoriaActiva === cat.id
                      ? "text-white"
                      : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                  }`}
                  style={categoriaActiva === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.nombre} ({conteoPorCategoria[cat.id] || 0})
                </button>
              ))}
            </div>

            {/* SUBCATEGORÍAS */}
            {categoriaActiva !== "todas" && subcategoriasDeCategoria.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
                <button
                  onClick={() => setSubcategoriaActiva("todas")}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    subcategoriaActiva === "todas"
                      ? "bg-blue-500 text-white"
                      : dark ? "bg-gray-600 text-gray-400" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  Todas ({conteoPorSubcategoria.todas})
                </button>
                {subcategoriasDeCategoria.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSubcategoriaActiva(sub.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      subcategoriaActiva === sub.id
                        ? "bg-blue-500 text-white"
                        : dark ? "bg-gray-600 text-gray-400" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {sub.nombre} ({conteoPorSubcategoria[sub.id] || 0})
                  </button>
                ))}
              </div>
            )}

              {/* RESULTADOS + SELECT ALL */}
            {activeTab === "disponibles" && (
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${textSecondary}`}>
                  {productosFiltrados.length} productos
                  {selectedCount > 0 && (
                    <span className="ml-2 text-green-500">• {selectedCount} seleccionados</span>
                  )}
                </span>
                <button
                  onClick={toggleSelectAll}
                  className={`text-xs ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  {selectedCount === productosDisponibles.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
            )}

            {/* LISTA */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-spin text-2xl">⟳</span>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">
                  {activeTab === "disponibles" ? "🎉" : "📭"}
                </span>
                <p className={textSecondary}>
                  {activeTab === "disponibles" 
                    ? "Todos los productos ya están agregados"
                    : "No hay productos agregados aún"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {productosFiltrados.map(producto => {
                  const cat = categorias.find(c => c.id === producto.category_id);
                  const subcat = subcategorias.find(s => s.id === producto.subcategory_id);
                  const infoUsuario = producto.infoUsuario;
                  const isInactive = producto.isInactive;
                  const isSelected = selectedProductsMap[producto.id] !== undefined;

                  const cardClasses = isSelected
                    ? `border-green-500 ${dark ? "bg-green-500/20" : "bg-green-50"}`
                    : isInactive
                      ? `${bgCard} ${borderColor} opacity-50`
                      : `${bgCard} ${borderColor} hover:border-blue-400`;

                  return (
                    <div
                      key={producto.id}
                      onClick={() => activeTab === "disponibles" && !isInactive && toggleProductSelection(producto)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${cardClasses} ${
                        activeTab === "disponibles" && !isInactive ? "cursor-pointer" : ""
                      } ${isInactive && activeTab === "yaAsignados" ? "cursor-default" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* INDICADOR DE SELECCIÓN */}
                        {activeTab === "disponibles" && (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected
                              ? "bg-green-500 border-green-500"
                              : dark
                              ? "border-gray-500"
                              : "border-gray-300"
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-medium ${textPrimary}`}>
                                {producto.name}
                              </p>
                              <p className={`text-xs ${textSecondary}`}>
                                {cat?.nombre || "Sin categoría"}
                                {subcat && ` › ${subcat.nombre}`}
                                {producto.brand_name && ` • ${producto.brand_name}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isInactive ? (
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  dark ? "bg-red-500/30 text-red-400" : "bg-red-100 text-red-600"
                                }`}>
                                  ⛔ Inactivo
                                </span>
                              ) : infoUsuario ? (
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  dark ? "bg-blue-500/30 text-blue-400" : "bg-blue-100 text-blue-600"
                                }`}>
                                  ✓
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  dark ? "bg-green-500/30 text-green-400" : "bg-green-100 text-green-600"
                                }`}>
                                  Nuevo
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Info del usuario si está asignado */}
                          {infoUsuario && (
                            <div className={`mt-2 text-xs p-2 rounded ${dark ? "bg-gray-700/50" : "bg-gray-100"}`}>
                              <span className={textSecondary}>
                                Compra: ${parseFloat(infoUsuario.precio_compra || 0).toLocaleString()} 
                                • Venta: ${parseFloat(infoUsuario.precio_venta || 0).toLocaleString()}
                                • Stock: {infoUsuario.stock ?? 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PANEL LATERAL */}
          <div className={`hidden md:block md:w-80 p-4 overflow-y-auto ${bgModal}`}>
            {selectedCount === 0 ? (
              <div className={`text-center py-8 ${textSecondary}`}>
                <span className="text-4xl mb-2 block">👆</span>
                <p className="text-sm">Hacé click en un producto para seleccionarlo</p>
              </div>
            ) : isSingleSelection ? (
              <div className="space-y-4">
                {(() => {
                  const [selectedItem] = Object.values(selectedProductsMap);
                  const product = selectedItem?.producto;
                  const data = selectedItem || {};
                  const pc = parseFloat(data.precio_compra) || 0;
                  const pv = parseFloat(data.precio_venta) || 0;
                  const ganancia = pv - pc;
                  const gananciaNegativa = pc > 0 && pv > 0 && pc > pv;
                  
                  return (
                    <>
                      <div>
                        <h3 className={`font-bold ${textPrimary}`}>
                          {product?.name}
                        </h3>
                        <p className={`text-sm ${textSecondary}`}>
                          {categorias.find(c => c.id === product?.category_id)?.nombre}
                          {product?.brand_name && ` • ${product.brand_name}`}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>P. Compra</label>
                          <input
                            type="number"
                            value={data.precio_compra || ""}
                            onChange={(e) => updateProductValue(product.id, "precio_compra", e.target.value)}
                            placeholder="0"
                            className={`w-full px-2 py-1.5 rounded-lg border ${inputBg} text-sm`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>P. Venta</label>
                          <input
                            type="number"
                            value={data.precio_venta || ""}
                            onChange={(e) => updateProductValue(product.id, "precio_venta", e.target.value)}
                            placeholder="0"
                            className={`w-full px-2 py-1.5 rounded-lg border ${inputBg} text-sm`}
                          />
                        </div>
                      </div>

                      {pv > 0 && pc > 0 && (
                        <div className={`p-2 rounded-lg text-xs ${gananciaNegativa ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                          {gananciaNegativa ? (
                            <span>⚠️ Ganancia: -${Math.abs(ganancia).toLocaleString()} por unidad</span>
                          ) : (
                            <span>✓ Ganancia: ${ganancia.toLocaleString()} por unidad</span>
                          )}
                        </div>
                      )}

                      <div>
                        <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Stock</label>
                        <input
                          type="number"
                          value={data.stock === 0 || data.stock === "" ? "" : data.stock}
                          onChange={(e) => updateProductValue(product.id, "stock", e.target.value)}
                          placeholder="0"
                          className={`w-full px-2 py-1.5 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Descripción (opcional)</label>
                        <textarea
                          value={data.descripcion || ""}
                          onChange={(e) => updateProductValue(product.id, "descripcion", e.target.value)}
                          placeholder="Descripción..."
                          className={`w-full px-2 py-1.5 rounded-lg border ${inputBg} text-sm resize-none`}
                          rows={2}
                        />
                      </div>

                      <button
                        onClick={handleAgregar}
                        disabled={submitting}
                        className={`w-full py-2 text-white rounded-lg font-medium disabled:opacity-50 transition-colors text-sm ${
                          gananciaNegativa ? "bg-yellow-600 hover:bg-yellow-500" : "bg-green-500 hover:bg-green-600"
                        }`}
                      >
                        {submitting ? "..." : gananciaNegativa ? "⚠️ Agregar con pérdida" : "✓ Agregar"}
                      </button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className={`font-bold ${textPrimary}`}>
                    📋 {selectedCount} productos
                  </h3>
                  <p className={`text-xs ${textSecondary}`}>Carga masiva - Seleccioná los valores a aplicar</p>
                </div>

                {/* Bulk inputs in sidebar */}
                <div className={`p-3 rounded-lg border ${borderColor}`}>
                  <p className={`text-xs font-medium mb-2 ${textSecondary}`}>Aplicar a todos:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="P. Venta"
                        value={bulkPrecioVenta}
                        onChange={(e) => setBulkPrecioVenta(e.target.value)}
                        className={`flex-1 px-2 py-1 rounded border text-xs ${inputBg} ${borderColor}`}
                      />
                      <button
                        onClick={() => { applyBulkToAll("precio_venta", bulkPrecioVenta); }}
                        disabled={!bulkPrecioVenta}
                        className="px-2 py-1 bg-purple-500 text-white rounded text-xs disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="P. Compra"
                        value={bulkPrecioCompra}
                        onChange={(e) => setBulkPrecioCompra(e.target.value)}
                        className={`flex-1 px-2 py-1 rounded border text-xs ${inputBg} ${borderColor}`}
                      />
                      <button
                        onClick={() => { applyBulkToAll("precio_compra", bulkPrecioCompra); }}
                        disabled={!bulkPrecioCompra}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Stock"
                        value={bulkStock}
                        onChange={(e) => setBulkStock(e.target.value)}
                        className={`flex-1 px-2 py-1 rounded border text-xs ${inputBg} ${borderColor}`}
                      />
                      <button
                        onClick={() => { applyBulkToAll("stock", bulkStock); }}
                        disabled={!bulkStock && bulkStock !== "0"}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`max-h-48 overflow-y-auto rounded-lg border ${borderColor}`}>
                  {Object.entries(selectedProductsMap).map(([id, item], index) => (
                    <div
                      key={id}
                      className={`p-2 flex items-center justify-between gap-2 ${
                        index !== 0 ? `border-t ${borderColor}` : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${textPrimary}`}>{item.producto.name}</p>
                        <p className={`text-[10px] ${textSecondary}`}>
                          V: {item.precio_venta || "-"} | C: {item.precio_compra || "-"} | S: {item.stock || "0"}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleProductSelection(item.producto)}
                        className={`p-1 rounded text-xs ${dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={hasAnyData ? handleAgregar : handleAgregarBulkSimple}
                  disabled={submitting}
                  className="w-full py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-green-600 transition-colors text-sm"
                >
                  {submitting ? "..." : hasAnyData ? `✓ Agregar ${selectedCount} con precios` : `✓ Agregar ${selectedCount}`}
                </button>
              </div>
            )}
          </div>

          {/* BARRA INFERIOR MOBILE */}
          {esMobile && selectedCount > 0 && (
            <div className={`fixed bottom-0 left-0 right-0 p-2 ${bgModal} border-t ${borderColor} shadow-xl z-50`}>
              {isSingleSelection ? (
                <div className="space-y-1">
                  {(() => {
                    const [selectedItem] = Object.values(selectedProductsMap);
                    const product = selectedItem?.producto;
                    const data = selectedItem || {};
                    const pc = parseFloat(data.precio_compra) || 0;
                    const pv = parseFloat(data.precio_venta) || 0;
                    const ganancia = pv - pc;
                    const gananciaNegativa = pc > 0 && pv > 0 && pc > pv;
                    
                    return (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-medium truncate flex-1 ${textPrimary}`}>
                            {product?.name}
                          </p>
                          <button
                            onClick={() => { setSelectedProductsMap({}); }}
                            className={`p-1 rounded text-xs ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}
                          >
                            ✕
                          </button>
                        </div>
                        {pv > 0 && pc > 0 && (
                          <p className={`text-[10px] px-1 ${gananciaNegativa ? "text-red-500" : "text-green-500"}`}>
                            {gananciaNegativa ? `⚠️ -$${Math.abs(ganancia).toLocaleString()}/u` : `✓ +$${ganancia.toLocaleString()}/u`}
                          </p>
                        )}
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={data.precio_compra || ""}
                            onChange={(e) => updateProductValue(product.id, "precio_compra", e.target.value)}
                            placeholder="Comp"
                            className={`flex-1 min-w-0 px-1.5 py-1 rounded border ${inputBg} text-xs`}
                          />
                          <input
                            type="number"
                            value={data.precio_venta || ""}
                            onChange={(e) => updateProductValue(product.id, "precio_venta", e.target.value)}
                            placeholder="Vent"
                            className={`flex-1 min-w-0 px-1.5 py-1 rounded border ${inputBg} text-xs`}
                          />
                          <input
                            type="number"
                            value={data.stock === 0 || data.stock === "" ? "" : data.stock}
                            onChange={(e) => updateProductValue(product.id, "stock", e.target.value)}
                            placeholder="Stk"
                            className={`w-12 px-1.5 py-1 rounded border ${inputBg} text-xs`}
                          />
                          <button
                            onClick={handleAgregar}
                            disabled={submitting}
                            className={`px-2 py-1 text-white rounded font-medium text-xs disabled:opacity-50 ${
                              gananciaNegativa ? "bg-yellow-600" : "bg-green-500"
                            }`}
                          >
                            ✓
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${textPrimary}`}>
                        📋 {selectedCount} productos
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedProductsMap({}); }}
                      className={`p-1 rounded text-xs ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Venta"
                      value={bulkPrecioVenta}
                      onChange={(e) => setBulkPrecioVenta(e.target.value)}
                      className={`flex-1 min-w-0 px-1.5 py-1 rounded border ${inputBg} text-xs`}
                    />
                    <input
                      type="number"
                      placeholder="Compra"
                      value={bulkPrecioCompra}
                      onChange={(e) => setBulkPrecioCompra(e.target.value)}
                      className={`flex-1 min-w-0 px-1.5 py-1 rounded border ${inputBg} text-xs`}
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                      className={`w-12 px-1.5 py-1 rounded border ${inputBg} text-xs`}
                    />
                    <button
                      onClick={() => { applyBulkToAll("precio_venta", bulkPrecioVenta); applyBulkToAll("precio_compra", bulkPrecioCompra); applyBulkToAll("stock", bulkStock); }}
                      className="px-2 py-1 bg-purple-500 text-white rounded text-xs"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={hasAnyData ? handleAgregar : handleAgregarBulkSimple}
                      disabled={submitting}
                      className="px-3 py-1 bg-green-500 text-white rounded font-medium text-xs disabled:opacity-50"
                    >
                      {submitting ? "..." : hasAnyData ? "✓ Agregar c/precios" : "✓ Agregar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INDICADOR MOBILE CUANDO NO HAY SELECCIÓN */}
          {esMobile && selectedCount === 0 && (
            <div className={`md:hidden fixed bottom-0 left-0 right-0 p-2 ${bgModal} border-t ${borderColor}`}>
              <p className={`text-xs text-center ${textSecondary}`}>👆 Seleccioná productos</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
