import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";

export function UlCustomProducts({ customProducts }) {
  const { categorias, preferencias, updatePreferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  // === Vista ===
  const [viewType, setViewType] = useState(
    preferencias?.view_custom_products === "list" ? "list" : "grid"
  );

  useEffect(() => {
    if (preferencias?.view_custom_products) {
      setViewType(preferencias.view_custom_products);
    }
  }, [preferencias]);

  // === NUEVO: estado general expandible ===
  const [showSection, setShowSection] = useState(
    false
  );

  const toggleSection = () => {
    const newState = !showSection;
    setShowSection(newState);

    // Guardar en preferencias

    // Si se colapsa → se pliegan categorías internas
    if (!newState) {
      setExpandedAll(false);
      setExpandedItems({});
    }
  };

  // === Buscador ===
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return customProducts;

    const term = search.toLowerCase();

    return customProducts.filter((p) => {
      const name = p.user_custom_products?.name?.toLowerCase() || "";
      const desc = p.descripcion?.toLowerCase() || "";
      const prov = p.proveedor_nombre?.toLowerCase() || "";

      return (
        name.includes(term) ||
        desc.includes(term) ||
        prov.includes(term)
      );
    });
  }, [search, customProducts]);

  // === Agrupar por categoría ===
  const productosPorCategoria = filteredProducts.reduce((acc, prod) => {
    const catId = prod.products_base.category_id ?? "Sin categoría";
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(prod);
    return acc;
  }, {});

  // === Expansiones internas ===
  const [expandedAll, setExpandedAll] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

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

    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!customProducts || customProducts.length === 0) {
    return (
      <p className={dark ? "text-gray-400" : "text-gray-500"}>
        No hay productos personalizados creados.
      </p>
    );
  }

  // === Estilos ===
  const btnBase = "px-3 py-1 rounded-lg font-medium transition-all duration-200";
  const btnActive = dark
    ? "bg-blue-600 text-white shadow"
    : "bg-blue-500 text-white shadow";
  const btnInactive = dark
    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
    : "bg-gray-200 text-gray-700 hover:bg-gray-300";

  const btnToggle = dark
    ? "bg-purple-600 hover:bg-purple-700 text-white"
    : "bg-purple-500 hover:bg-purple-600 text-white";

  const liBg = dark
    ? "bg-gray-800 border-gray-700 text-gray-200"
    : "bg-white border-gray-200 text-gray-900";

  const liShadow = dark
    ? "shadow-md hover:shadow-lg"
    : "shadow-sm hover:shadow-md";

  return (
    <div className="w-full">

      {/* ====== Barra superior ====== */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        {/* Vista */}
        <div className="flex gap-2">
          <button
            className={`${btnBase} ${
              viewType === "list" ? btnActive : btnInactive
            }`}
            onClick={() => {
              setViewType("list");
              updatePreferencias({ view_custom_products: "list" });
            }}
          >
            Lista
          </button>

          <button
            className={`${btnBase} ${
              viewType === "grid" ? btnActive : btnInactive
            }`}
            onClick={() => {
              setViewType("grid");
              updatePreferencias({ view_custom_products: "grid" });
            }}
          >
            Mosaico
          </button>
        </div>

        {/* Expandir todos */}
        <button className={`${btnBase} ${btnToggle}`} onClick={toggleExpandedAll}>
          {expandedAll ? "Colapsar todos" : "Expandir todos"}
        </button>
      </div>

      {/* ======================= Sección expandible general ======================= */}
      <div className="w-full mb-2">
        <button
          onClick={toggleSection}
          className="flex justify-between items-center w-full py-2 px-3 rounded-lg 
            bg-gradient-to-r from-purple-500/20 to-transparent
            hover:from-purple-500/30 transition-all duration-300 select-none"
        >
          <h1
            className={`text-xl font-semibold ${
              dark ? "text-gray-200" : "text-gray-900"
            }`}
          >
            Productos creados ({customProducts.length})
          </h1>

          <span
            className={`transition-transform duration-300 ${
              showSection ? "rotate-180" : ""
            }`}
          >
            ⌄
          </span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          showSection ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`
            mt-2 w-full px-3 py-2 rounded-lg border
            ${dark ? "bg-gray-800 text-gray-200 border-gray-700" : "bg-white border-gray-300"}
          `}
        />
      </div>

      {/* Contenido de la sección */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          showSection ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {/* ======================= LISTADO POR CATEGORÍAS ======================= */}
        {Object.entries(productosPorCategoria).map(([catId, productos]) => {
          const catName =
            categorias.find((c) => c.id === Number(catId))?.nombre ||
            "Sin categoría";

          return (
            <div key={catId} className="mb-4">

              {/* Título Categoría */}
              <h2
                className={`text-lg font-bold mb-2 ${
                  dark ? "text-blue-300" : "text-blue-700"
                }`}
              >
                {catName}
              </h2>

              {/* Lista */}
              <ul
                className={`${
                  viewType === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
                    : "space-y-1"
                }`}
              >
                {productos.map((prod) => {
                  const isExpanded = expandedAll || expandedItems[prod.id];

                  return (
                    <li
                      key={prod.id}
                      className={`rounded-xl p-1 flex flex-col gap-3 border-3 ${liBg} ${liShadow} transition-all duration-300 hover:scale-[1.01]`}
                    >
                      {/* Header item */}
                      <div
                        className="flex justify-between items-center cursor-pointer select-none"
                        onClick={() => toggleOne(prod.id)}
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {prod.user_custom_products?.name}
                          </h3>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              dark
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            Creado
                          </span>
                        </div>

                        <span
                          className={`transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          ⌄
                        </span>
                      </div>

                      {/* Detalles */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isExpanded ? "max-h-[1000px] mt-2" : "max-h-0"
                        }`}
                      >
                        <div
                          className={`border grid grid-cols-3 gap-1 text-base p-[.5em] rounded-lg ${
                            dark ? "bg-gray-800/40" : "bg-gray-50"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={dark ? "text-gray-300" : "text-gray-700"}>
                              Precio compra
                            </span>
                            <span
                              className={`font-semibold ${
                                dark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              ${prod.precio_compra}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className={dark ? "text-gray-100" : "text-gray-900"}>
                              Precio venta
                            </span>
                            <span
                              className={`font-semibold ${
                                dark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              ${prod.precio_venta}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className={dark ? "text-gray-300" : "text-gray-700"}>
                              Stock
                            </span>
                            <span
                              className={`font-semibold ${
                                dark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {prod.stock}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={dark ? "text-gray-200" : "text-gray-900"}>
                              Proveedor
                            </span>
                            <span
                              className={`font-semibold ${
                                dark ? "text-gray-100" : "text-gray-900"
                              }`}
                            >
                              {prod.proveedor_nombre}
                            </span>
                          </div>
                        </div>

                        {/* Descripción */}
                        <div
                          className={`mt-3 pt-2 border-t ${
                            dark
                              ? "border-gray-700 text-gray-400"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          <div className="max-h-[2.5em] min-h-[2.5em] overflow-y-auto pr-1">
                            <p className="leading-snug whitespace-pre-line">
                              {prod.descripcion
                                ? prod.descripcion.charAt(0).toUpperCase() +
                                  prod.descripcion.slice(1)
                                : "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
