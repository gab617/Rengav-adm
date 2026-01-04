import React, { useMemo } from "react";
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
  } = useAppContext();

  const dark = preferencias?.theme === "dark";

  const {
    filtros,
    setFiltroNombre,
    setFiltroMarca,
    setFiltroStock,
    setSoloCustom,
    toggleCategoria,
    toggleSubcategoria,
    productosFiltrados,
    productosCustomFiltrados,
    marcasDisponibles,
  } = useProductFilters(products, categorias, subcategorias, unifiedBrands);

  const productosBase = filtros.soloCustom
    ? productosCustomFiltrados
    : productosFiltrados;

  const productosActivos = useMemo(
    () => productosBase.filter((p) => p.active !== false),
    [productosBase]
  );

  // ⬇️ AGRUPADO POR CATEGORÍA / SUBCATEGORÍA
  const productosPorCategoria = useMemo(() => {
    return categorias.map((categoria) => {
      const productosEnCategoria = productosActivos.filter(
        (p) => p.products_base?.category_id === categoria.id
      );

      const productosConSubcategoria = subcategorias
        .filter((s) => s.id_categoria === categoria.id)
        .map((sub) => ({
          subcategoria: sub,
          productos: productosEnCategoria
            .filter((p) => p.products_base?.subcategory_id === sub.id)
            .sort((a, b) =>
              a.products_base.name.localeCompare(b.products_base.name)
            ),
        }));

      const productosSinSubcategoria = productosEnCategoria
        .filter((p) => !p.products_base?.subcategory_id)
        .sort((a, b) =>
          a.products_base.name.localeCompare(b.products_base.name)
        );

      return {
        categoria,
        productosConSubcategoria,
        productosSinSubcategoria,
      };
    });
  }, [categorias, subcategorias, productosActivos]);

  // ⬇️ RETURNS CONDICIONALES (después de hooks)
  if (loading)
    return (
      <div className={dark ? "text-gray-200" : "text-gray-800"}>
        Cargando productos...
      </div>
    );

  if (error)
    return (
      <div className={dark ? "text-gray-200" : "text-gray-800"}>
        Error: {error}
      </div>
    );

  // ------------------------------
  // CLASES
  // ------------------------------
  const bgContainer = dark
    ? "bg-gray-900 text-gray-200"
    : "bg-gray-50 text-gray-900";
  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const textGray = dark ? "text-gray-200" : "text-gray-700";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300 placeholder-gray-500";

  return (
    <div
      className={`flex flex-col w-[95%] mx-auto p-4 rounded-xl shadow-md ${bgContainer}`}
    >
      {/* FILTROS */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre..."
          className={`p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 w-full md:w-auto ${inputBg}`}
          value={filtros.filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
        />

        {/* 🏷 Marca */}
        {/* 🏷 Marca */}
        <div className="flex gap-2 w-full md:w-auto">
          {/* Input libre */}
          <input
            type="text"
            placeholder="🏷 Marca..."
            className={`p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 w-full ${inputBg}`}
            value={filtros.filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
          />

          {/* Select */}
          <select
            value={filtros.filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className={`p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 ${inputBg}`}
          >
            <option value="">Todas</option>
            {marcasDisponibles.map((marca) => (
              <option key={marca} value={marca}>
                {marca}
              </option>
            ))}
          </select>
        </div>

        <input
          type="number"
          placeholder="📦 Stock máximo"
          className={`p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 w-full md:w-auto ${inputBg}`}
          value={filtros.filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
        />
      </div>
      {/* TOGGLE SOLO PERSONALIZADOS */}
      <label className="px-3 mb-2 flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filtros.soloCustom}
          onChange={(e) => setSoloCustom(e.target.checked)}
          className="w-5 h-5 accent-purple-500"
        />
        <span className={`font-medium ${textGray}`}>
          Solo productos personalizados
        </span>
      </label>

      {/* CATEGORÍAS */}
      <div
        className={`flex flex-wrap gap-4 mb-4 p-3 rounded-lg shadow-sm ${bgCard}`}
      >
        {categorias.map((cat) => (
          <label
            key={cat.id}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={filtros.filtroCategorias.includes(cat.id)}
              onChange={() => toggleCategoria(cat.id)}
              className="w-5 h-5 accent-blue-500"
            />
            <span className={`font-medium ${textGray}`}>{cat.nombre}</span>
          </label>
        ))}
      </div>

      {/* SUBCATEGORÍAS */}
      <div
        className={`flex flex-wrap gap-4 mb-6 p-3 rounded-lg shadow-sm ${bgCard}`}
      >
        {subcategorias
          .filter((s) => filtros.filtroCategorias.includes(s.id_categoria))
          .map((sub) => (
            <label
              key={sub.id}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filtros.filtroSubcategorias.includes(sub.id)}
                onChange={() => toggleSubcategoria(sub.id)}
                className="w-5 h-5 accent-green-500"
              />
              <span className={`font-medium ${textGray}`}>{sub.nombre}</span>
            </label>
          ))}
      </div>

      {/* LISTA */}
      <div className="w-full">
        {productosPorCategoria
          .filter(
            (c) =>
              c.productosSinSubcategoria.length > 0 ||
              c.productosConSubcategoria.some((s) => s.productos.length > 0)
          )
          .map(
            ({
              categoria,
              productosConSubcategoria,
              productosSinSubcategoria,
            }) => (
              <div
                key={categoria.id}
                className={`mb-6 p-4 rounded-lg shadow-md ${bgCard}`}
              >
                <h3
                  className="text-xl font-bold text-white px-4 py-2 rounded-md"
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
                  />
                ))}

                {productosConSubcategoria
                  .filter((s) => s.productos.length > 0)
                  .map(({ subcategoria, productos }) => (
                    <div key={subcategoria.id}>
                      <h4 className={`text-lg font-medium mt-3 ${textGray}`}>
                        {subcategoria.nombre}
                      </h4>
                      {productos.map((prod) => (
                        <LiPedido
                          key={prod.id}
                          prod={prod}
                          categoria={categoria}
                          dark={dark}
                        />
                      ))}
                    </div>
                  ))}
              </div>
            )
          )}
      </div>
    </div>
  );
}
