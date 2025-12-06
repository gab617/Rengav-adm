import React, { useState } from "react";
import { useAppContext } from "../../../contexto/Context";
import { categorias, subcategorias } from "../const";
import { FormProducts } from "./FormProducts";
import { ProductosCategorizados } from "./ProductosCategorizados";
import { Loader1 } from "../../../contexto/loader1";
import { Filtros } from "./Filtros";

export function UlProducts() {
  const { products, loadingProductos } = useAppContext();/* useProducts */

  const [filtroCategorias, setFiltroCategorias] = useState([]);
  const [filtroSubcategorias, setFiltroSubcategorias] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroStock, setFiltroStock] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(true); // <--- Estado para toggle

  if (loadingProductos) return <Loader1 />;

  const toggleCategoria = (id) => {
    setFiltroCategorias((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setFiltroSubcategorias((prev) =>
      prev.filter(
        (sub) =>
          !subcategorias.find((s) => s.id === sub && s.id_categoria === id)
      )
    );
  };

  const toggleSubcategoria = (id) => {
    setFiltroSubcategorias((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const productosFiltrados = products.filter((prod) => {
    const base = prod.products_base;

    const cumpleCategoria =
      filtroCategorias.length === 0 ||
      filtroCategorias.includes(base.category_id);

    const cumpleSubcategoria =
      filtroSubcategorias.length === 0 ||
      filtroSubcategorias.includes(base.subcategory_id);

    const cumpleNombre = base?.name
      .toLowerCase()
      .includes(filtroNombre.toLowerCase());

    const cumpleStock = !filtroStock || prod.stock <= Number(filtroStock);

    return cumpleCategoria && cumpleSubcategoria && cumpleNombre && cumpleStock;
  });

  const productosPorCategoria = categorias.map((categoria) => {
    const productosEnCategoria = productosFiltrados.filter(
      (prod) => prod.products_base.category_id === categoria.id
    );

    const productosPorSubcategoria = subcategorias
      .filter((sub) => sub.id_categoria === categoria.id)
      .map((subcategoria) => {
        const productosEnSubcategoria = productosEnCategoria.filter(
          (prod) => prod.products_base.subcategory_id === subcategoria.id
        );
        return {
          subcategoria,
          productos: productosEnSubcategoria.sort((a, b) =>
            a.products_base.name.localeCompare(b.products_base.name)
          ),
        };
      });

    const productosSinSubcategoria = productosEnCategoria
      .filter((prod) => !prod.products_base.subcategory_id)
      .sort((a, b) => a.products_base.name.localeCompare(b.products_base.name));

    return {
      categoria,
      productosConSubcategoria: productosPorSubcategoria,
      productosSinSubcategoria,
    };
  });

  return (
    <div className="w-full px-2 md:px-6 py-4">
      {/* Botón para mostrar/ocultar filtros */}
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow"
        >
          {mostrarFiltros ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </div>

      {/* Filtros y formulario */}
      <div className="flex flex-col gap-6 mb-6">
        {/* Panel de Filtros */}
        {mostrarFiltros && (
          <Filtros
            filtroNombre={filtroNombre}
            setFiltroNombre={setFiltroNombre}
            filtroStock={filtroStock}
            setFiltroStock={setFiltroStock}
            filtroCategorias={filtroCategorias}
            toggleCategoria={toggleCategoria}
            filtroSubcategorias={filtroSubcategorias}
            toggleSubcategoria={toggleSubcategoria}
            categorias={categorias}
            subcategorias={subcategorias}
          />
        )}


      </div>

      {/* Productos agrupados */}
      <ProductosCategorizados productosPorCategoria={productosPorCategoria} />
    </div>
  );
}
