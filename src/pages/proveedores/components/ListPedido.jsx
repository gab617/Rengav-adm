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
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(!esMobile);
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [subcategoriaActiva, setSubcategoriaActiva] = useState("todas");

  useEffect(() => {
    const handleResize = () => {
      setEsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setFiltrosExpandidos(true);
      }
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
    <div className={`flex flex-col gap-3 ${dark ? "text-white" : "text-gray-900"}`}>
      {/* HEADER CON BÚSQUEDA */}
      <div className={`p-3 rounded-2xl ${bgCard} border ${borderColor}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold">📦 Productos</h2>
            <p className={`text-xs ${textSecondary}`}>
              {productosFiltradosFinal.length} productos
              {pedidos.length > 0 && (
                <span className="text-green-400 ml-1">• {pedidos.length} en pedido</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
            className={`p-2 rounded-xl transition-all text-sm ${
              filtrosExpandidos
                ? dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
            }`}
          >
            {filtrosExpandidos ? "▲" : "⚙️ Filtros"}
          </button>
        </div>

        {/* BÚSQUEDA */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
          <input
            type="text"
            placeholder="Buscar..."
            className={`w-full pl-9 pr-9 py-2.5 rounded-xl border ${inputBg} text-sm`}
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
      </div>

      {/* FILTROS EXPANDIBLES */}
      {filtrosExpandidos && (
        <div className={`p-3 rounded-2xl ${bgCard} border ${borderColor} space-y-2`}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🏷️</span>
              <input
                type="text"
                placeholder="Marca..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border ${inputBg} text-sm`}
                value={filtros.filtroMarca}
                onChange={(e) => setFiltroMarca(e.target.value)}
              />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">📦</span>
              <input
                type="number"
                placeholder="Stock máx..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border ${inputBg} text-sm`}
                value={filtros.filtroStock}
                onChange={(e) => setFiltroStock(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.soloCustom}
                onChange={(e) => setSoloCustom(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className={`text-xs ${textSecondary}`}>Solo custom</span>
            </label>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  dark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
                }`}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* CATEGORÍAS */}
      <div className={`overflow-x-auto pb-1 ${bgCard} rounded-xl`}>
        <div className="flex gap-1.5 p-2 min-w-max">
          <button
            onClick={() => handleSelectCategoria("todas")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              categoriaActiva === "todas"
                ? "bg-blue-500 text-white shadow"
                : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
            }`}
          >
            Todas ({conteoPorCategoria.todas})
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategoria(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
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

      {/* SUBCATEGORÍAS */}
      {categoriaActiva !== "todas" && subcategoriasDeCategoria.length > 0 && (
        <div className={`overflow-x-auto pb-1 ${dark ? "bg-gray-800/50" : "bg-gray-50"} rounded-xl`}>
          <div className="flex gap-1 p-1.5 min-w-max">
            <button
              onClick={() => setSubcategoriaActiva("todas")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                subcategoriaActiva === "todas"
                  ? "bg-blue-500 text-white"
                  : dark ? "bg-gray-700 text-gray-400" : "bg-white text-gray-500"
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
                    : dark ? "bg-gray-700 text-gray-400" : "bg-white text-gray-500"
                }`}
              >
                {sub.nombre} ({conteoPorSubcategoria[sub.id] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="space-y-3">
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
