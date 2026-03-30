import React, { useState, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";

export function UlCustomProducts({ customProducts }) {
  const { categorias, subcategorias, preferencias, updatePreferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [viewType, setViewType] = useState(
    preferencias?.view_custom_products === "list" ? "list" : "grid"
  );

  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [subcategoriaActiva, setSubcategoriaActiva] = useState("todas");
  const [expandedAll, setExpandedAll] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  // Subcategorías de la categoría seleccionada
  const subcategoriasDeCategoria = useMemo(() => {
    if (categoriaActiva === "todas") return [];
    return subcategorias.filter((s) => s.id_categoria === categoriaActiva);
  }, [categoriaActiva, subcategorias]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    let result = customProducts || [];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((p) => {
        const name = p.user_custom_products?.name?.toLowerCase() || "";
        const desc = p.descripcion?.toLowerCase() || "";
        const prov = p.proveedor_nombre?.toLowerCase() || "";
        return name.includes(term) || desc.includes(term) || prov.includes(term);
      });
    }

    if (categoriaActiva !== "todas") {
      result = result.filter((p) => p.products_base?.category_id === categoriaActiva);
    }

    if (subcategoriaActiva !== "todas" && subcategoriaActiva !== null) {
      result = result.filter((p) => p.products_base?.subcategory_id === subcategoriaActiva);
    }

    return result;
  }, [customProducts, search, categoriaActiva, subcategoriaActiva]);

  // Agrupar por categoría
  const productosPorCategoria = useMemo(() => {
    const grupos = {};
    filteredProducts.forEach((prod) => {
      const catId = prod.products_base?.category_id ?? "sin-categoria";
      if (!grupos[catId]) grupos[catId] = [];
      grupos[catId].push(prod);
    });
    return grupos;
  }, [filteredProducts]);

  // Contadores por categoría
  const conteoPorCategoria = useMemo(() => {
    const counts = { todas: (customProducts || []).length };
    (customProducts || []).forEach((p) => {
      const catId = p.products_base?.category_id;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    });
    return counts;
  }, [customProducts]);

  // Contadores por subcategoría
  const conteoPorSubcategoria = useMemo(() => {
    if (categoriaActiva === "todas") return {};
    const counts = { todas: conteoPorCategoria[categoriaActiva] || 0 };
    (customProducts || [])
      .filter((p) => p.products_base?.category_id === categoriaActiva)
      .forEach((p) => {
        const subId = p.products_base?.subcategory_id;
        if (subId) {
          counts[subId] = (counts[subId] || 0) + 1;
        }
      });
    return counts;
  }, [customProducts, categoriaActiva, conteoPorCategoria]);

  // Categorías que tienen productos
  const categoriasConProductos = useMemo(() => {
    const catIds = new Set((customProducts || []).map((p) => p.products_base?.category_id).filter(Boolean));
    return categorias.filter((c) => catIds.has(c.id));
  }, [categorias, customProducts]);

  const handleSelectCategoria = (catId) => {
    setCategoriaActiva(catId);
    setSubcategoriaActiva("todas");
  };

  const toggleExpandedAll = () => {
    if (expandedAll) {
      setExpandedAll(false);
      setExpandedItems({});
    } else {
      const all = {};
      filteredProducts.forEach((p) => (all[p.id] = true));
      setExpandedItems(all);
      setExpandedAll(true);
    }
  };

  const toggleOne = (id) => {
    if (expandedAll) return;
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Estilos
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-700" : "bg-white";
  const bgItem = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-600 text-white" : "bg-gray-50 text-gray-900";
  const borderColor = dark ? "border-gray-600" : "border-gray-200";

  if (!customProducts || customProducts.length === 0) {
    return (
      <div className={`text-center py-8 ${textSecondary}`}>
        <span className="text-4xl mb-2 block">📦</span>
        <p>No hay productos personalizados creados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* HEADER CON CONTROLES */}
      <div className={`p-3 rounded-xl ${bgCard}`}>
        {/* Búsqueda */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
          <input
            type="text"
            placeholder="Buscar productos..."
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

        {/* Vista + Expandir */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => {
                setViewType("list");
                updatePreferencias({ view_custom_products: "list" });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewType === "list"
                  ? dark ? "bg-blue-500/30 text-blue-400" : "bg-blue-100 text-blue-600"
                  : `${textSecondary}`
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => {
                setViewType("grid");
                updatePreferencias({ view_custom_products: "grid" });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewType === "grid"
                  ? dark ? "bg-blue-500/30 text-blue-400" : "bg-blue-100 text-blue-600"
                  : `${textSecondary}`
              }`}
            >
              ⊞ Mosaico
            </button>
          </div>
          <button
            onClick={toggleExpandedAll}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
            }`}
          >
            {expandedAll ? "⊟ Colapsar" : "⊞ Expandir"}
          </button>
        </div>
      </div>

      {/* CATEGORÍAS COMO TABS */}
      <div className={`overflow-x-auto pb-1 ${bgCard} rounded-xl`}>
        <div className="flex gap-1.5 p-2 min-w-max">
          <button
            onClick={() => handleSelectCategoria("todas")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              categoriaActiva === "todas"
                ? "bg-blue-500 text-white"
                : dark ? "bg-gray-600 text-gray-300" : "bg-gray-100 text-gray-600"
            }`}
          >
            Todas ({conteoPorCategoria.todas})
          </button>
          {categoriasConProductos.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategoria(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                categoriaActiva === cat.id
                  ? "text-white"
                  : dark ? "bg-gray-600 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}
              style={categoriaActiva === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.nombre} ({conteoPorCategoria[cat.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* SUBCATEGORÍAS */}
      {categoriaActiva !== "todas" && subcategoriasDeCategoria.length > 0 && (
        <div className={`overflow-x-auto pb-1 ${dark ? "bg-gray-800/50" : "bg-gray-50"} rounded-xl`}>
          <div className="flex gap-1 p-1.5 min-w-max">
            <button
              onClick={() => setSubcategoriaActiva("todas")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                subcategoriaActiva === "todas"
                  ? "bg-blue-500 text-white"
                  : dark ? "bg-gray-600 text-gray-400" : "bg-white text-gray-500"
              }`}
            >
              Todas ({conteoPorSubcategoria.todas})
            </button>
            {subcategoriasDeCategoria.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubcategoriaActiva(sub.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  subcategoriaActiva === sub.id
                    ? "bg-blue-500 text-white"
                    : dark ? "bg-gray-600 text-gray-400" : "bg-white text-gray-500"
                }`}
              >
                {sub.nombre} ({conteoPorSubcategoria[sub.id] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RESULTADOS */}
      <div className={`p-3 rounded-xl ${bgCard} text-sm ${textSecondary}`}>
        {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
        {categoriaActiva !== "todas" && (
          <span> de {categorias.find((c) => c.id === categoriaActiva)?.nombre}</span>
        )}
        {subcategoriaActiva !== "todas" && (
          <span> › {subcategorias.find((s) => s.id === subcategoriaActiva)?.nombre}</span>
        )}
      </div>

      {/* LISTA POR CATEGORÍAS */}
      {Object.entries(productosPorCategoria).length === 0 ? (
        <div className={`p-6 text-center rounded-xl ${bgCard}`}>
          <span className="text-4xl mb-2 block">📭</span>
          <p className={textSecondary}>Sin resultados</p>
        </div>
      ) : (
        Object.entries(productosPorCategoria).map(([catId, productos]) => {
          const cat = categorias.find((c) => c.id === Number(catId));
          const catNombre = cat?.nombre || "Sin categoría";
          const catColor = cat?.color || "#666";

          return (
            <div key={catId} className={`p-3 rounded-xl ${bgCard} border ${borderColor}`}>
              {/* HEADER CATEGORÍA */}
              <h3
                className="text-sm font-bold text-white px-3 py-1.5 rounded-lg mb-3 inline-block"
                style={{ backgroundColor: catColor }}
              >
                {catNombre}
              </h3>

              {/* PRODUCTOS */}
              <div
                className={
                  viewType === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
                    : "space-y-2"
                }
              >
                {productos.map((prod) => {
                  const isExpanded = expandedAll || expandedItems[prod.id];
                  const subcat = subcategorias.find((s) => s.id === prod.products_base?.subcategory_id);

                  return (
                    <div
                      key={prod.id}
                      className={`rounded-xl border p-3 transition-all ${
                        isExpanded ? "border-blue-500/50 shadow-lg" : bgItem
                      }`}
                    >
                      {/* HEADER */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleOne(prod.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-lg ${isExpanded ? "rotate-90 transition-transform" : ""}`}>
                            ▶
                          </span>
                          <h4 className={`font-semibold truncate ${textPrimary}`}>
                            {prod.user_custom_products?.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1">
                          {subcat && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              dark ? "bg-gray-600/50 text-gray-400" : "bg-gray-100 text-gray-500"
                            }`}>
                              {subcat.nombre}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            dark ? "bg-gray-600 text-gray-300" : "bg-gray-100 text-gray-600"
                          }`}>
                            {prod.products_base?.brand || prod.products_base?.brand_text || "Sin marca"}
                          </span>
                        </div>
                      </div>

                      {/* DETALLES */}
                      {isExpanded && (
                        <div className={`mt-3 pt-3 border-t ${borderColor}`}>
                          {/* PRECIOS Y STOCK */}
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className={`p-2 rounded-lg ${dark ? "bg-gray-600/50" : "bg-gray-50"}`}>
                              <p className={`text-xs ${textSecondary}`}>Compra</p>
                              <p className={`font-bold ${textPrimary}`}>
                                ${parseFloat(prod.precio_compra || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className={`p-2 rounded-lg ${dark ? "bg-gray-600/50" : "bg-gray-50"}`}>
                              <p className={`text-xs ${textSecondary}`}>Venta</p>
                              <p className={`font-bold text-green-500`}>
                                ${parseFloat(prod.precio_venta || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className={`p-2 rounded-lg ${dark ? "bg-gray-600/50" : "bg-gray-50"}`}>
                              <p className={`text-xs ${textSecondary}`}>Stock</p>
                              <p className={`font-bold ${textPrimary}`}>
                                {prod.stock ?? 0}
                              </p>
                            </div>
                          </div>

                          {/* PROVEEDOR */}
                          {prod.proveedor_nombre && (
                            <div className={`text-xs ${textSecondary} mb-2`}>
                              📦 Proveedor: <span className={textPrimary}>{prod.proveedor_nombre}</span>
                            </div>
                          )}

                          {/* DESCRIPCIÓN */}
                          <div className={`text-xs ${textSecondary}`}>
                            <p className={`line-clamp-2 ${textPrimary}`}>
                              {prod.descripcion || "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
