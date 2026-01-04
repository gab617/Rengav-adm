import { useMemo, useState } from "react";

export function useProductFilters(
  products = [],
  categorias = [],
  subcategorias = [],
  unifiedBrands = []
) {
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroStock, setFiltroStock] = useState("");
  const [filtroCategorias, setFiltroCategorias] = useState([]);
  const [filtroSubcategorias, setFiltroSubcategorias] = useState([]);
  const [soloCustom, setSoloCustom] = useState(false);

  const toggleCategoria = (id) => {
    setFiltroCategorias((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

    setFiltroSubcategorias((prev) =>
      prev.filter(
        (subId) =>
          !subcategorias.some((s) => s.id === subId && s.id_categoria === id)
      )
    );
  };

  const toggleSubcategoria = (id) => {
    setFiltroSubcategorias((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // 🔹 Función común de filtrado
  const filtrarProducto = (prod) => {
    const base = prod.products_base;
    if (!base) return false;

    const brandLabel = base.brand ?? base.brand_text ?? "";

    const cumpleNombre =
      !filtroNombre ||
      base.name?.toLowerCase().includes(filtroNombre.toLowerCase());

    const cumpleMarca =
      !filtroMarca ||
      brandLabel.toLowerCase().includes(filtroMarca.toLowerCase());

    const cumpleCategoria =
      filtroCategorias.length === 0 ||
      filtroCategorias.includes(base.category_id);

    const cumpleSubcategoria =
      filtroSubcategorias.length === 0 ||
      filtroSubcategorias.includes(base.subcategory_id);

    const cumpleStock = !filtroStock || prod.stock <= Number(filtroStock);

    return (
      cumpleNombre &&
      cumpleMarca &&
      cumpleCategoria &&
      cumpleSubcategoria &&
      cumpleStock
    );
  };

  // 🔹 Todos los productos
  const productosFiltrados = useMemo(() => {
    return products.filter(filtrarProducto);
  }, [
    products,
    filtroNombre,
    filtroMarca,
    filtroStock,
    filtroCategorias,
    filtroSubcategorias,
  ]);

  // 🔹 SOLO productos custom
  const productosCustomFiltrados = useMemo(() => {
    return products.filter(
      (prod) => prod.tipo === "custom" && filtrarProducto(prod)
    );
  }, [
    products,
    filtroNombre,
    filtroMarca,
    filtroStock,
    filtroCategorias,
    filtroSubcategorias,
  ]);

  const marcasDisponibles = useMemo(() => {
    const marcas = unifiedBrands.map((b) => b?.label).filter(Boolean);
    return [...new Set(marcas)].sort((a, b) => a.localeCompare(b));
  }, [unifiedBrands]);

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
      soloCustom
    },
    setFiltroNombre,
    setFiltroMarca,
    setFiltroStock,
    setSoloCustom,
    toggleCategoria,
    toggleSubcategoria,
    productosFiltrados,
    productosCustomFiltrados, 
    marcasDisponibles,
    resetFiltros,
  };
}
