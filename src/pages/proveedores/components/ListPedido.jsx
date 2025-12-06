import React, { useState } from "react";
import { useAppContext } from "../../../contexto/Context";
import { categorias, subcategorias } from "../../productos/const";
import { LiPedido } from "./LiPedido";

export function ListPedido() {
  const { products, loading, error, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [filtroCategorias, setFiltroCategorias] = useState([]);
  const [filtroSubcategorias, setFiltroSubcategorias] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroStock, setFiltroStock] = useState("");

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
  // TOGGLE CATEGORÍA
  // ------------------------------
  const toggleCategoria = (id) => {
    setFiltroCategorias((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setFiltroSubcategorias((prev) =>
      prev.filter(
        (sub) =>
          !subcategorias.some((s) => s.id === sub && s.id_categoria === id)
      )
    );
  };

  // ------------------------------
  // TOGGLE SUBCATEGORÍA
  // ------------------------------
  const toggleSubcategoria = (id) => {
    setFiltroSubcategorias((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // ------------------------------
  // FILTROS
  // ------------------------------
  const productosFiltrados = products
    .filter((prod) => prod.active !== false) // ⬅⬅ SOLO productos activos
    .filter((prod) => {
      const base = prod.products_base || {};

      const nombre = base.name?.toLowerCase() || "";
      const categoriaID = base.category_id;
      const subcategoriaID = base.subcategory_id;

      const cumpleCategoria =
        filtroCategorias.length === 0 || filtroCategorias.includes(categoriaID);
      const cumpleSubcategoria =
        filtroSubcategorias.length === 0 ||
        filtroSubcategorias.includes(subcategoriaID);
      const cumpleNombre = nombre.includes(filtroNombre.toLowerCase());
      const cumpleStock = !filtroStock || prod.stock <= Number(filtroStock);

      return (
        cumpleCategoria && cumpleSubcategoria && cumpleNombre && cumpleStock
      );
    });

  // ------------------------------
  // AGRUPAR POR CATEGORÍA Y SUBCATEGORÍA
  // ------------------------------
  const productosPorCategoria = categorias.map((categoria) => {
    const productosEnCategoria = productosFiltrados.filter(
      (p) => p.products_base?.category_id === categoria.id
    );

    const productosPorSubcategoria = subcategorias
      .filter((s) => s.id_categoria === categoria.id)
      .map((sub) => {
        const productos = productosEnCategoria
          .filter((p) => p.products_base?.subcategory_id === sub.id)
          .sort((a, b) =>
            a.products_base.name.localeCompare(b.products_base.name)
          );
        return { subcategoria: sub, productos };
      });

    const productosSinSubcategoria = productosEnCategoria
      .filter((p) => !p.products_base?.subcategory_id)
      .sort((a, b) => a.products_base.name.localeCompare(b.products_base.name));

    return {
      categoria,
      productosConSubcategoria: productosPorSubcategoria,
      productosSinSubcategoria,
    };
  });

  // ------------------------------
  // CLASES ADAPTATIVAS
  // ------------------------------
  const bgContainer = dark
    ? "bg-gray-900 text-gray-200"
    : "bg-gray-50 text-gray-900";
  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const textGray = dark ? "text-gray-200" : "text-gray-700";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300 placeholder-gray-500";

  // ------------------------------
  // RENDER
  // ------------------------------
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
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
        />
        <input
          type="number"
          placeholder="📦 Stock máximo"
          className={`p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 w-full md:w-auto ${inputBg}`}
          value={filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
        />
      </div>

      {/* CATEGORÍAS */}
      <div
        className={`flex flex-wrap gap-4 mb-4 p-3 rounded-lg shadow-sm text-lg ${bgCard}`}
      >
        {categorias.map((cat) => (
          <label
            key={cat.id}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={filtroCategorias.includes(cat.id)}
              onChange={() => toggleCategoria(cat.id)}
              className="w-5 h-5 accent-blue-500"
            />
            <span className={`font-medium ${textGray}`}>{cat.nombre}</span>
          </label>
        ))}
      </div>

      {/* SUBCATEGORÍAS */}
      <div
        className={`flex flex-wrap gap-4 mb-6 p-3 rounded-lg shadow-sm text-lg ${bgCard}`}
      >
        {subcategorias
          .filter((s) => filtroCategorias.includes(s.id_categoria))
          .map((sub) => (
            <label
              key={sub.id}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filtroSubcategorias.includes(sub.id)}
                onChange={() => toggleSubcategoria(sub.id)}
                className="w-5 h-5 accent-green-500"
              />
              <span className={`font-medium ${textGray}`}>{sub.nombre}</span>
            </label>
          ))}
      </div>

      {/* LISTA DE PRODUCTOS */}
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

                {/* SIN SUBCATEGORÍA */}
                {productosSinSubcategoria.length > 0 && (
                  <div>
                    <h4 className={`text-lg font-semibold mt-3 ${textGray}`}>
                      📌 Productos sin subcategoría
                    </h4>
                    <ul>
                      {productosSinSubcategoria.map((prod) => (
                        <li
                          key={prod.id}
                          className={`rounded-lg ${
                            dark ? "bg-gray-700" : "bg-gray-100"
                          }`}
                        >
                          <LiPedido
                            prod={prod}
                            categoria={categoria}
                            dark={dark}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CON SUBCATEGORÍA */}
                {productosConSubcategoria
                  .filter((s) => s.productos.length > 0)
                  .map(({ subcategoria, productos }) => (
                    <div key={subcategoria.id}>
                      <h4 className={`text-lg font-medium mt-3 ${textGray}`}>
                        {subcategoria.nombre}
                      </h4>
                      <ul>
                        {productos.map((prod) => (
                          <li
                            key={prod.id}
                            className={`rounded-lg ${
                              dark ? "bg-gray-500" : "bg-gray-100"
                            }`}
                          >
                            <LiPedido
                              prod={prod}
                              categoria={categoria}
                              dark={dark}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )
          )}
      </div>
    </div>
  );
}
