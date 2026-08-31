import { useMemo, useState } from "react";

export function useProductFilters(
  products = [],
  categorias = [],
  subcategorias = [],
  unifiedBrands = [],
) {
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroId, setFiltroId] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroStock, setFiltroStock] = useState("");
  const [filtroCategorias, setFiltroCategorias] = useState([]);
  const [filtroSubcategorias, setFiltroSubcategorias] = useState([]);
  const [soloCustom, setSoloCustom] = useState(false);
  const [soloPeso, setSoloPeso] = useState(false); // productos por peso
  const [soloDestacados, setSoloDestacados] = useState(false);
  const [soloOcultos, setSoloOcultos] = useState(false);

  const toggleCategoria = (id) => {
    setFiltroCategorias((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

    setFiltroSubcategorias((prev) =>
      prev.filter(
        (subId) =>
          !subcategorias.some((s) => s.id === subId && s.id_categoria === id),
      ),
    );
  };

  const toggleSubcategoria = (id) => {
    setFiltroSubcategorias((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  // 🔹 Función común de filtrado
  const filtrarProducto = (prod) => {
    const base = prod.products_base;
    if (!base) return false;

    const brandLabel = base.brand || base.brand_text || "";

    const nombreBase = base.name ?? "";
    const nombreCustom = prod.user_custom_products?.name ?? "";
    const nombreCompleto = prod.tipo === "custom" ? nombreCustom : nombreBase;

    const cumpleNombre =
      !filtroNombre ||
      nombreCompleto.toLowerCase().includes(filtroNombre.toLowerCase());
    const cumpleId =
      !filtroId ||
      String(prod.id).includes(filtroId);
    const cumpleMarca =
      !filtroMarca ||
      filtroMarca === "Sin marca" && brandLabel === "" ||
      brandLabel !== "" && brandLabel.toLowerCase().includes(filtroMarca.toLowerCase());

    const cumpleCategoria =
      filtroCategorias.length === 0 ||
      filtroCategorias.includes(base.category_id);

    const cumpleSubcategoria =
      filtroSubcategorias.length === 0 ||
      filtroSubcategorias.includes(base.subcategory_id);

    const cumpleStock = !filtroStock || prod.stock <= Number(filtroStock);

    const cumplePeso = !soloPeso || base.type_unit === "weight";

    // Ocultos: por default se muestran TODOS (incluyendo ocultos, señalizados en la card);
    // si soloOcultos activo, mostrar SOLO los ocultos
    const cumpleVisible = !soloOcultos || prod.visible === false;

    // Destacados: si soloDestacados activo, mostrar SOLO destacado=true
    const cumpleDestacado = !soloDestacados || prod.destacado === true;

    return (
      cumpleNombre &&
      cumpleId &&
      cumpleMarca &&
      cumpleCategoria &&
      cumpleSubcategoria &&
      cumpleStock &&
      cumplePeso &&
      cumpleVisible &&
      cumpleDestacado
    );
  };

  // 🔹 Todos los productos
  const productosFiltrados = useMemo(() => {
    return products.filter(filtrarProducto);
  }, [
    products,
    filtroNombre,
    filtroId,
    filtroMarca,
    filtroStock,
    filtroCategorias,
    filtroSubcategorias,
    soloPeso,
    soloDestacados,
    soloOcultos,
  ]);

  // 🔹 SOLO productos custom
  const productosCustomFiltrados = useMemo(() => {
    return products.filter(
      (prod) => prod.tipo === "custom" && filtrarProducto(prod),
    );
  }, [
    products,
    filtroNombre,
    filtroId,
    filtroMarca,
    filtroStock,
    filtroCategorias,
    filtroSubcategorias,
    soloPeso,
    soloDestacados,
    soloOcultos,
  ]);

  const marcasDisponibles = useMemo(() => {
    const mapa = {};
    products.forEach((p) => {
      const brand = p.products_base?.brand || p.products_base?.brand_text || "Sin marca";
      mapa[brand] = (mapa[brand] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([label, count]) => ({ label, count, key: label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const resetFiltros = () => {
    setFiltroNombre("");
    setFiltroMarca("");
    setFiltroStock("");
    setFiltroCategorias([]);
    setFiltroSubcategorias([]);
    setSoloCustom(false);
    setSoloPeso(false);
    setSoloDestacados(false);
    setSoloOcultos(false);
  };

  return {
    filtros: {
      filtroNombre,
      filtroId,
      filtroMarca,
      filtroStock,
      filtroCategorias,
      filtroSubcategorias,
      soloCustom,
      soloPeso,
      soloDestacados,
      soloOcultos,
    },
    setFiltroNombre,
    setFiltroId,
    setFiltroMarca,
    setFiltroStock,
    setSoloCustom,
    setSoloPeso,
    setSoloDestacados,
    setSoloOcultos,
    toggleCategoria,
    toggleSubcategoria,
    productosFiltrados,
    productosCustomFiltrados,
    marcasDisponibles,
    resetFiltros,
  };
}
