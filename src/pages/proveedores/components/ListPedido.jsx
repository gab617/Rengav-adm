import React, { useMemo, useState, useEffect } from "react";
import { useAppContext } from "../../../contexto/Context";
import { useProductFilters } from "../../../hooksSB/useProductsFilters";
import { LiPedido } from "./LiPedido";

export function ListPedido() {
  const {
    products,
    loading,
    error,
    preferencias,
    categorias,
    subcategorias,
    unifiedBrands,
    pedidos,
  } = useAppContext();

  const dark = preferencias?.theme === "dark";
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [subcategoriaActiva, setSubcategoriaActiva] = useState("todas");

  useEffect(() => {
    const handleResize = () => {
      setEsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    filtros,
    setFiltroNombre,
    setFiltroMarca,
    setFiltroStock,
    setSoloCustom,
    productosFiltrados,
    productosCustomFiltrados,
    marcasDisponibles,
  } = useProductFilters(products, categorias, subcategorias, unifiedBrands);

  const productosBase = filtros.soloCustom
    ? productosCustomFiltrados
    : productosFiltrados;

  const productosActivos = useMemo(
    () => productosBase.filter((p) => p.active !== false),
    [productosBase],
  );

  const productosEnPedido = useMemo(() => {
    return new Set(pedidos.map((p) => p.id));
  }, [pedidos]);

  const tieneFiltrosActivos = useMemo(() => {
    return (
      filtros.filtroNombre ||
      filtros.filtroMarca ||
      filtros.filtroStock ||
      filtros.filtroCategorias.length > 0 ||
      filtros.filtroSubcategorias.length > 0
    );
  }, [filtros]);

  const limpiarFiltros = () => {
    setFiltroNombre("");
    setFiltroMarca("");
    setFiltroStock("");
    setSoloCustom(false);
    setCategoriaActiva("todas");
    setSubcategoriaActiva("todas");
  };

  // SUBCATEGORÍAS DE LA CATEGORÍA SELECCIONADA
  const subcategoriasDeCategoria = useMemo(() => {
    if (categoriaActiva === "todas") return [];
    return subcategorias.filter((s) => s.id_categoria === categoriaActiva);
  }, [categoriaActiva, subcategorias]);

  // CONTADORES POR CATEGORÍA
  const conteoPorCategoria = useMemo(() => {
    const counts = { todas: productosActivos.length };
    productosActivos.forEach((p) => {
      const catId = p.products_base?.category_id;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    });
    return counts;
  }, [productosActivos]);

  // CONTADORES POR SUBCATEGORÍA
  const conteoPorSubcategoria = useMemo(() => {
    if (categoriaActiva === "todas") return {};
    const counts = { todas: conteoPorCategoria[categoriaActiva] || 0 };
    productosActivos
      .filter((p) => p.products_base?.category_id === categoriaActiva)
      .forEach((p) => {
        const subId = p.products_base?.subcategory_id;
        if (subId) {
          counts[subId] = (counts[subId] || 0) + 1;
        }
      });
    return counts;
  }, [productosActivos, categoriaActiva, conteoPorCategoria]);

  // PRODUCTOS FILTRADOS
  const productosFiltradosFinal = useMemo(() => {
    let result = productosActivos;

    if (categoriaActiva !== "todas") {
      result = result.filter((p) => p.products_base?.category_id === categoriaActiva);
    }

    if (subcategoriaActiva !== "todas" && subcategoriaActiva !== null) {
      result = result.filter((p) => p.products_base?.subcategory_id === subcategoriaActiva);
    }

    return result;
  }, [productosActivos, categoriaActiva, subcategoriaActiva]);

  // AGRUPADO POR CATEGORÍA / SUBCATEGORÍA
  const productosPorCategoria = useMemo(() => {
    return categorias.map((categoria) => {
      const productosEnCategoria = productosFiltradosFinal.filter(
        (p) => p.products_base?.category_id === categoria.id,
      );

      const productosConSubcategoria = subcategorias
        .filter((s) => s.id_categoria === categoria.id)
        .map((sub) => ({
          subcategoria: sub,
          productos: productosEnCategoria
            .filter((p) => p.products_base?.subcategory_id === sub.id)
            .sort((a, b) =>
              a.products_base.name.localeCompare(b.products_base.name),
            ),
        }));

      const productosSinSubcategoria = productosEnCategoria
        .filter((p) => !p.products_base?.subcategory_id)
        .sort((a, b) =>
          a.products_base.name.localeCompare(b.products_base.name),
        );

      return {
        categoria,
        productosConSubcategoria,
        productosSinSubcategoria,
      };
    });
  }, [categorias, subcategorias, productosFiltradosFinal]);

  const handleSelectCategoria = (catId) => {
    setCategoriaActiva(catId);
    setSubcategoriaActiva("todas");
  };

  if (loading)
    return (
      <div className={`p-8 text-center ${dark ? "text-gray-200" : "text-gray-800"}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="mt-4">Cargando productos...</p>
      </div>
    );

  if (error)
    return (
      <div className={`p-8 text-center text-red-500`}>
        <span className="text-4xl mb-2 block">⚠️</span>
        <p>Error: {error}</p>
      </div>
    );

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300 placeholder-gray-400";

  const categoriasVisibles = productosPorCategoria.filter(
    (c) =>
      c.productosSinSubcategoria.length > 0 ||
      c.productosConSubcategoria.some((s) => s.productos.length > 0)
  );

  const categoriaSeleccionada = categorias.find((c) => c.id === categoriaActiva);

  return (
    <div className={`flex flex-col gap-2 ${dark ? "text-white" : "text-gray-900"}`}>
      {/* BÚSQUEDA */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
        <input
          type="text"
          placeholder="Buscar productos..."
          className={`w-full pl-10 pr-10 py-3 rounded-xl border ${inputBg} text-sm`}
          value={filtros.filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
        />
        {filtros.filtroNombre && (
          <button
            onClick={() => setFiltroNombre("")}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary}`}
          >
            ✕
          </button>
        )}
      </div>

      {/* CATEGORÍAS - BARRA HORIZONTAL */}
      {categorias.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${textSecondary}`}>📁 CATEGORÍAS</span>
            {categoriaActiva !== "todas" && (
              <button 
                onClick={() => { setCategoriaActiva("todas"); setSubcategoriaActiva("todas"); }} 
                className="text-xs text-purple-500 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategoria(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  categoriaActiva === cat.id
                    ? "text-white shadow"
                    : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                }`}
                style={categoriaActiva === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.nombre} ({conteoPorCategoria[cat.id] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUBCATEGORÍAS - BARRA HORIZONTAL */}
      {categoriaActiva !== "todas" && subcategoriasDeCategoria.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${textSecondary}`}>📂 SUBCATEGORÍAS</span>
            {subcategoriaActiva !== "todas" && (
              <button 
                onClick={() => setSubcategoriaActiva("todas")} 
                className="text-xs text-green-500 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {subcategoriasDeCategoria.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubcategoriaActiva(subcategoriaActiva === sub.id ? "todas" : sub.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  subcategoriaActiva === sub.id
                    ? "bg-green-500 text-white shadow"
                    : dark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600"
                }`}
              >
                {sub.nombre} ({conteoPorSubcategoria[sub.id] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FILTROS RÁPIDOS */}
      <div className={`p-3 rounded-xl ${bgCard} border ${borderColor}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${textSecondary}`}>⚡ FILTROS</span>
          {tieneFiltrosActivos && (
            <button 
              onClick={limpiarFiltros} 
              className="text-xs text-red-500 hover:underline"
            >
              ✕ Limpiar todo
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* MARCA SELECT */}
          <select
            value={filtros.filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-xs ${inputBg} shrink-0`}
          >
            <option value="">🏷️ Marca</option>
            {marcasDisponibles?.map((m) => (
              <option key={m.key || m.label} value={m.label}>{m.label}</option>
            ))}
          </select>

          {/* MARCA INPUT */}
          <input
            type="text"
            placeholder="O escribí..."
            value={filtros.filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-xs ${inputBg} w-24 shrink-0`}
          />

          {/* STOCK */}
          <div className="relative shrink-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs opacity-50">⚠️</span>
            <input
              type="number"
              placeholder="Stock ≤"
              value={filtros.filtroStock}
              onChange={(e) => setFiltroStock(e.target.value)}
              className={`w-20 pl-6 pr-2 py-2 rounded-lg border text-xs ${inputBg}`}
            />
          </div>

          {/* TIPO */}
          <button
            onClick={() => setSoloCustom(!filtros.soloCustom)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
              filtros.soloCustom
                ? "bg-purple-500 text-white"
                : dark ? "border border-gray-600 text-gray-300" : "border border-gray-200 text-gray-600"
            }`}
          >
            ✨ {filtros.soloCustom ? "Custom" : "Todos"}
          </button>
        </div>
      </div>

      {/* HEADER RESULTADOS */}
      <div className={`p-2 rounded-xl ${bgCard} border ${borderColor} flex items-center justify-between`}>
        <span className={`text-sm ${textSecondary}`}>
          {productosFiltradosFinal.length} productos
        </span>
        {pedidos.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            🛒 {pedidos.length} en pedido
          </span>
        )}
      </div>

      {/* LISTA */}
      <div className="space-y-2">
        {productosFiltradosFinal.length === 0 ? (
          <div className={`p-6 text-center rounded-2xl ${bgCard}`}>
            <span className="text-4xl mb-2 block">📭</span>
            <h3 className={`font-medium ${textPrimary}`}>
              {products.length === 0 ? "No hay productos" : "Sin resultados"}
            </h3>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="mt-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : categoriaActiva === "todas" ? (
          categoriasVisibles.map(({ categoria, productosConSubcategoria, productosSinSubcategoria }) => (
            <div key={categoria.id} className={`p-3 rounded-2xl ${bgCard} border ${borderColor}`}>
              <h3
                className="text-sm font-bold text-white px-3 py-1.5 rounded-lg mb-2 inline-block"
                style={{ backgroundColor: categoria.color }}
              >
                {categoria.nombre}
              </h3>

              {productosSinSubcategoria.map((prod) => (
                <LiPedido
                  key={prod.id}
                  prod={prod}
                  categoria={categoria}
                  dark={dark}
                  enPedido={productosEnPedido.has(prod.id)}
                />
              ))}

              {productosConSubcategoria
                .filter((s) => s.productos.length > 0)
                .map(({ subcategoria, productos }) => (
                  <div key={subcategoria.id} className="mt-2">
                    <h4 className={`text-xs font-medium mb-1 ${textSecondary}`}>
                      {subcategoria.nombre}
                    </h4>
                    {productos.map((prod) => (
                      <LiPedido
                        key={prod.id}
                        prod={prod}
                        categoria={categoria}
                        dark={dark}
                        enPedido={productosEnPedido.has(prod.id)}
                      />
                    ))}
                  </div>
                ))}
            </div>
          ))
        ) : (
          <div className={`p-3 rounded-2xl ${bgCard} border ${borderColor}`}>
            {categoriaSeleccionada && (
              <h3
                className="text-sm font-bold text-white px-3 py-1.5 rounded-lg mb-2 inline-block"
                style={{ backgroundColor: categoriaSeleccionada.color }}
              >
                {categoriaSeleccionada.nombre}
              </h3>
            )}
            
            {productosFiltradosFinal
              .filter((p) => !p.products_base?.subcategory_id)
              .map((prod) => (
                <LiPedido
                  key={prod.id}
                  prod={prod}
                  categoria={categoriaSeleccionada || { color: "#666" }}
                  dark={dark}
                  enPedido={productosEnPedido.has(prod.id)}
                />
              ))}

            {subcategoriasDeCategoria
              .filter((sub) => {
                if (subcategoriaActiva === "todas") return true;
                return sub.id === subcategoriaActiva;
              })
              .map((sub) => {
                const prods = productosFiltradosFinal.filter(
                  (p) => p.products_base?.subcategory_id === sub.id
                );
                if (prods.length === 0) return null;
                return (
                  <div key={sub.id} className="mt-2">
                    <h4 className={`text-xs font-medium mb-1 ${textSecondary}`}>
                      {sub.nombre}
                    </h4>
                    {prods.map((prod) => (
                      <LiPedido
                        key={prod.id}
                        prod={prod}
                        categoria={categoriaSeleccionada || { color: "#666" }}
                        dark={dark}
                        enPedido={productosEnPedido.has(prod.id)}
                      />
                    ))}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
