import { useMemo, useState } from "react";

export function useProductFilters(
  products = [],
  categorias = [],
  subcategorias = []
) {
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroStock, setFiltroStock] = useState("");
  const [filtroCategorias, setFiltroCategorias] = useState([]);
  const [filtroSubcategorias, setFiltroSubcategorias] = useState([]);

  const toggleCategoria = (id) => {
    setFiltroCategorias((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

    setFiltroSubcategorias((prev) =>
      prev.filter(
        (subId) =>
          !subcategorias.some(
            (s) => s.id === subId && s.id_categoria === id
          )
      )
    );
  };

  const toggleSubcategoria = (id) => {
    setFiltroSubcategorias((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const productosFiltrados = useMemo(() => {
    return products.filter((prod) => {
      const base = prod.products_base;
      if (!base) return false;

      const cumpleNombre =
        !filtroNombre ||
        base.name?.toLowerCase().includes(filtroNombre.toLowerCase());

      const cumpleMarca =
        !filtroMarca ||
        base.brand?.toLowerCase().includes(filtroMarca.toLowerCase());

      const cumpleCategoria =
        filtroCategorias.length === 0 ||
        filtroCategorias.includes(base.category_id);

      const cumpleSubcategoria =
        filtroSubcategorias.length === 0 ||
        filtroSubcategorias.includes(base.subcategory_id);

      const cumpleStock =
        !filtroStock || prod.stock <= Number(filtroStock);

      return (
        cumpleNombre &&
        cumpleMarca &&
        cumpleCategoria &&
        cumpleSubcategoria &&
        cumpleStock
      );
    });
  }, [
    products,
    filtroNombre,
    filtroMarca,
    filtroStock,
    filtroCategorias,
    filtroSubcategorias,
  ]);

  const marcasDisponibles = useMemo(() => {
    const marcas = products
      .map((p) => p.products_base?.brand)
      .filter(Boolean);

    return [...new Set(marcas)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [products]);

  const resetFiltros = () => {
    setFiltroNombre("");
    setFiltroMarca("");
    setFiltroStock("");
    setFiltroCategorias([]);
    setFiltroSubcategorias([]);
  };

  return {
    filtros: {
      filtroNombre,
      filtroMarca,
      filtroStock,
      filtroCategorias,
      filtroSubcategorias,
    },
    setFiltroNombre,
    setFiltroMarca,
    setFiltroStock,
    toggleCategoria,
    toggleSubcategoria,
    productosFiltrados,
    marcasDisponibles,
    resetFiltros,
  };
}
