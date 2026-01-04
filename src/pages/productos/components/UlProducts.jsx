import React, { useState, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import { useProductFilters } from "../../../hooksSB/useProductsFilters";
import { ProductosCategorizados } from "./ProductosCategorizados";
import { Loader1 } from "../../../contexto/Loader1";
import { Filtros } from "./Filtros";

export function UlProducts() {
  const {
    products,
    loadingProductos,
    categorias,
    subcategorias,
    unifiedBrands, // 👈 si lo tenés en contexto
  } = useAppContext();

  const {
    filtros,
    setFiltroNombre,
    setFiltroMarca,
    setFiltroStock,
    setSoloCustom,
    toggleCategoria,
    toggleSubcategoria,
    productosFiltrados,
    productosCustomFiltrados, // 👈 NUEVO
    marcasDisponibles, // 👈 AHORA VIENE DEL HOOK
  } = useProductFilters(products, categorias, subcategorias, unifiedBrands);
  const productosActivos = filtros.soloCustom
    ? productosCustomFiltrados
    : productosFiltrados;

  const [mostrarFiltros, setMostrarFiltros] = useState(
    window.innerWidth >= 768
  );

const productosPorCategoria = useMemo(() => {
  if (!categorias?.length) return [];

  return categorias.map((categoria) => {
    const productosEnCategoria = productosActivos.filter(
      (p) => p.products_base?.category_id === categoria.id
    );

    const productosConSubcategoria = subcategorias
      .filter((s) => s.id_categoria === categoria.id)
      .map((subcategoria) => ({
        subcategoria,
        productos: productosEnCategoria
          .filter(
            (p) => p.products_base?.subcategory_id === subcategoria.id
          )
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


  // ⬇️ AHORA SÍ, returns condicionales
  if (loadingProductos) return <Loader1 />;
  if (!categorias?.length) return null;
  return (
    <div className="w-full px-2 md:px-6 py-1">
      {/* BOTÓN FILTROS → SOLO MOBILE */}
      <div className="mb-1 md:hidden">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-sm font-medium shadow"
        >
          {mostrarFiltros ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </div>

      {/* PANEL FILTROS */}
      <div
        className={`transition-all duration-300 ${
          mostrarFiltros
            ? "max-h-[2000px] opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        } md:max-h-none md:opacity-100 md:overflow-visible`}
      >
        <Filtros
          filtroNombre={filtros.filtroNombre}
          setFiltroNombre={setFiltroNombre}
          filtroMarca={filtros.filtroMarca}
          setFiltroMarca={setFiltroMarca}
          filtroStock={filtros.filtroStock}
          setFiltroStock={setFiltroStock}
          filtroCategorias={filtros.filtroCategorias}
          soloCustom={filtros.soloCustom}
          setSoloCustom = {setSoloCustom}
          toggleCategoria={toggleCategoria}
          filtroSubcategorias={filtros.filtroSubcategorias}
          toggleSubcategoria={toggleSubcategoria}
          categorias={categorias}
          subcategorias={subcategorias}
          marcas={marcasDisponibles}
        />
      </div>

      <ProductosCategorizados productosPorCategoria={productosPorCategoria} />
    </div>
  );
}
