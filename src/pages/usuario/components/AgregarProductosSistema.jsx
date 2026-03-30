import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import { useAuth } from "../../../contexto/AuthContext";
import { useProductosSistema } from "../../../hooksSB/useProductosSistema";

export function AgregarProductosSistema({ onClose, onProductoAgregado }) {
  const { user } = useAuth();
  const { preferencias, categorias, subcategorias, products, agregarProductoBase } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [loaded, setLoaded] = useState(false);

  const {
    productosSistema,
    assignedProducts,
    loading,
    error,
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

  // IDs de productos base que el usuario YA tiene
  const idsAsignados = useMemo(() => {
    return new Set(products.map(p => p.base_id).filter(Boolean));
  }, [products]);

  // Map de productos asignados con su info
  const productosAsignadosMap = useMemo(() => {
    const map = {};
    products.forEach(p => {
      if (p.base_id) {
        map[p.base_id] = p;
      }
    });
    return map;
  }, [products]);

  // Separar productos en dos listas (disponibles + asignados instantáneos)
  const { productosDisponibles, productosAsignados } = useMemo(() => {
    const disponibles = [];
    const asignados = [];
    const seenBaseIds = new Set();

    // Productos del sistema (ya asignados previamente)
    productosSistema.forEach(p => {
      seenBaseIds.add(p.id);
      if (idsAsignados.has(p.id)) {
        asignados.push({
          ...p,
          infoUsuario: productosAsignadosMap[p.id],
        });
      } else {
        disponibles.push(p);
      }
    });

    // Productos recién agregados en esta sesión (actualización instantánea)
    assignedProducts.forEach(p => {
      if (!seenBaseIds.has(p.base_id)) {
        seenBaseIds.add(p.base_id);
        disponibles.push({
          id: p.base_id,
          name: p.products_base?.name,
          brand_name: p.products_base?.brand,
          category_id: p.products_base?.category_id,
          subcategory_id: p.products_base?.subcategory_id,
          infoUsuario: p,
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
        });
      }
    });

    return { productosDisponibles: disponibles, productosAsignados: asignados };
  }, [productosSistema, assignedProducts, idsAsignados, productosAsignadosMap]);

  // Estado
  const [activeTab, setActiveTab] = useState("disponibles");
  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [subcategoriaActiva, setSubcategoriaActiva] = useState("todas");
  
  // Selección múltiple
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Formulario para un solo producto
  const [formSingle, setFormSingle] = useState({
    precio_compra: "",
    precio_venta: "",
    stock: "",
    descripcion: "",
  });

  // Subcategorías de la categoría seleccionada
  const subcategoriasDeCategoria = useMemo(() => {
    if (categoriaActiva === "todas") return [];
    return subcategorias.filter(s => s.id_categoria === categoriaActiva);
  }, [categoriaActiva, subcategorias]);

  // Filtrar productos según la pestaña activa
  const productosFiltrados = useMemo(() => {
    const source = activeTab === "disponibles" ? productosDisponibles : productosAsignados;

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

  // Contadores por categoría
  const conteoPorCategoria = useMemo(() => {
    const counts = { todas: productosSistema.length };
    productosSistema.forEach(p => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [productosSistema]);

  // Contadores por subcategoría
  const conteoPorSubcategoria = useMemo(() => {
    if (categoriaActiva === "todas") return {};
    const counts = { todas: conteoPorCategoria[categoriaActiva] || 0 };
    productosSistema
      .filter(p => p.category_id === categoriaActiva)
      .forEach(p => {
        if (p.subcategory_id) {
          counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1;
        }
      });
    return counts;
  }, [productosSistema, categoriaActiva, conteoPorCategoria]);

  // Categorías con productos
  const categoriasConProductos = useMemo(() => {
    const catIds = new Set(productosSistema.map(p => p.category_id).filter(Boolean));
    return categorias.filter(c => catIds.has(c.id));
  }, [categorias, productosSistema]);

  // Toggle selección de producto (clic en toda la card)
  const toggleProductSelection = (producto) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === producto.id);
      if (isSelected) {
        return prev.filter(p => p.id !== producto.id);
      }
      return [...prev, producto];
    });
  };

  // Toggle seleccionar todos
  const toggleSelectAll = () => {
    if (selectedProducts.length === productosDisponibles.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts([...productosDisponibles]);
    }
  };

  // Agregar UN producto con datos específicos
  const handleAgregarUno = async () => {
    if (selectedProducts.length !== 1) return;
    
    const producto = selectedProducts[0];
    setSubmitting(true);

    const result = await agregarProductosBulk([producto], {
      precio_compra: formSingle.precio_compra ? parseFloat(formSingle.precio_compra) : 0,
      precio_venta: formSingle.precio_venta ? parseFloat(formSingle.precio_venta) : 0,
      stock: formSingle.stock ? parseInt(formSingle.stock) : 0,
      descripcion: formSingle.descripcion || null,
    });

    setSubmitting(false);

    if (result.success && result.productos.length > 0) {
      result.productos.forEach(p => agregarProductoBase(p));
      setSelectedProducts([]);
      setFormSingle({ precio_compra: "", precio_venta: "", stock: "", descripcion: "" });
    } else {
      alert(result.error || "Error al agregar");
    }
  };

  // Agregar MÚLTIPLES productos (bulk sin datos)
  const handleAgregarBulk = async () => {
    if (selectedProducts.length < 2) return;
    
    setSubmitting(true);

    const result = await agregarProductosBulk(selectedProducts, {});

    setSubmitting(false);

    if (result.success && result.productos.length > 0) {
      result.productos.forEach(p => agregarProductoBase(p));
      setSelectedProducts([]);
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

  const isSingleSelection = selectedProducts.length === 1;
  const isMultiSelection = selectedProducts.length >= 2;

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
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${dark ? "hover:bg-gray-500 text-white" : "hover:bg-gray-200"}`}
          >
            ✕
          </button>
        </div>

        {/* TABS */}
        <div className={`px-4 py-2 border-b ${borderColor}`}>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab("disponibles");
                setSelectedProducts([]);
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
                setSelectedProducts([]);
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

        {/* BARRA DE ACCIÓN */}
        {activeTab === "disponibles" && selectedProducts.length > 0 && (
          <div className={`px-4 py-2 border-b ${borderColor} ${dark ? "bg-green-500/10" : "bg-green-50"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textPrimary}`}>
                {isSingleSelection && (
                  <span>📝 1 producto seleccionado - Editar datos</span>
                )}
                {isMultiSelection && (
                  <span>📋 {selectedProducts.length} productos seleccionados - Carga masiva</span>
                )}
              </span>
              <button
                onClick={() => setSelectedProducts([])}
                className={`px-3 py-1 rounded-lg text-sm ${dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        )}

        {/* CONTENIDO */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* LISTA DE PRODUCTOS */}
          <div className={`flex-1 overflow-y-auto p-4 ${borderColor} md:border-r`}>
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
                  {selectedProducts.length > 0 && (
                    <span className="ml-2 text-green-500">• {selectedProducts.length} seleccionados</span>
                  )}
                </span>
                <button
                  onClick={toggleSelectAll}
                  className={`text-xs ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  {selectedProducts.length === productosDisponibles.length ? "Deseleccionar todos" : "Seleccionar todos"}
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
                  const isSelected = selectedProducts.some(p => p.id === producto.id);

                  return (
                    <div
                      key={producto.id}
                      onClick={() => activeTab === "disponibles" && toggleProductSelection(producto)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? `border-green-500 ${dark ? "bg-green-500/20" : "bg-green-50"}`
                          : `${bgCard} ${borderColor} hover:border-blue-400`
                      }`}
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
                              {infoUsuario && (
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  dark ? "bg-blue-500/30 text-blue-400" : "bg-blue-100 text-blue-600"
                                }`}>
                                  ✓
                                </span>
                              )}
                              {!infoUsuario && (
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
          <div className={`w-full md:w-72 p-4 overflow-y-auto ${bgModal}`}>
            {selectedProducts.length === 0 ? (
              <div className={`text-center py-8 ${textSecondary}`}>
                <span className="text-4xl mb-2 block">👆</span>
                <p className="text-sm">Hacé click en un producto para seleccionarlo</p>
              </div>
            ) : isSingleSelection ? (
              /* UN SOLO PRODUCTO - FORMULARIO */
              <div className="space-y-4">
                <div>
                  <h3 className={`font-bold ${textPrimary}`}>
                    {selectedProducts[0].name}
                  </h3>
                  <p className={`text-sm ${textSecondary}`}>
                    {categorias.find(c => c.id === selectedProducts[0].category_id)?.nombre}
                    {selectedProducts[0].brand_name && ` • ${selectedProducts[0].brand_name}`}
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Precio Compra
                  </label>
                  <input
                    type="number"
                    value={formSingle.precio_compra}
                    onChange={(e) => setFormSingle(prev => ({ ...prev, precio_compra: e.target.value }))}
                    placeholder="0"
                    className={`w-full px-3 py-2 rounded-xl border ${inputBg} text-sm`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    value={formSingle.precio_venta}
                    onChange={(e) => setFormSingle(prev => ({ ...prev, precio_venta: e.target.value }))}
                    placeholder="0"
                    className={`w-full px-3 py-2 rounded-xl border ${inputBg} text-sm`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Stock
                  </label>
                  <input
                    type="number"
                    value={formSingle.stock}
                    onChange={(e) => setFormSingle(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    className={`w-full px-3 py-2 rounded-xl border ${inputBg} text-sm`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Descripción
                  </label>
                  <textarea
                    value={formSingle.descripcion}
                    onChange={(e) => setFormSingle(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Notas..."
                    rows={2}
                    className={`w-full px-3 py-2 rounded-xl border ${inputBg} text-sm resize-none`}
                  />
                </div>

                <button
                  onClick={handleAgregarUno}
                  disabled={submitting}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-green-600 transition-colors"
                >
                  {submitting ? "Agregando..." : "✓ Agregar producto"}
                </button>
              </div>
            ) : (
              /* MÚLTIPLES PRODUCTOS - LISTADO */
              <div className="space-y-4">
                <div>
                  <h3 className={`font-bold ${textPrimary}`}>
                    📋 {selectedProducts.length} productos
                  </h3>
                  <p className={`text-sm ${textSecondary}`}>
                    Carga masiva sin datos específicos
                  </p>
                </div>

                <div className={`max-h-64 overflow-y-auto rounded-xl border ${borderColor}`}>
                  {selectedProducts.map((producto, index) => {
                    const cat = categorias.find(c => c.id === producto.category_id);
                    return (
                      <div
                        key={producto.id}
                        className={`p-2 flex items-center justify-between gap-2 ${
                          index !== 0 ? `border-t ${borderColor}` : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${textPrimary}`}>
                            {producto.name}
                          </p>
                          <p className={`text-xs truncate ${textSecondary}`}>
                            {cat?.nombre || "Sin categoría"}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleProductSelection(producto)}
                          className={`p-1 rounded ${dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleAgregarBulk}
                  disabled={submitting}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-green-600 transition-colors"
                >
                  {submitting ? "Agregando..." : `✓ Agregar ${selectedProducts.length} productos`}
                </button>

                <p className={`text-xs text-center ${textSecondary}`}>
                  Los productos se agregarán con precio y stock en 0
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
