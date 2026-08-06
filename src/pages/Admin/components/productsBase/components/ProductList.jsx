import { useMemo, useState, useEffect } from "react";
import { useAppContext } from "../../../../../contexto/Context";

export function ProductList({ products = [], categories = [], subcategories = [], adminCategoryIds = [], tieneCatalogoDefinido = false }) {
  const { preferencias, profile } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [filtroPeso, setFiltroPeso] = useState(false);
  const [filtroEnUso, setFiltroEnUso] = useState("todos");
  const [vistaCatalogo, setVistaCatalogo] = useState(tieneCatalogoDefinido ? "catalogo" : "completo");
  const [brandSortBy, setBrandSortBy] = useState("count-desc");

  const removeAccents = (str) => {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const normalizeSearch = removeAccents(search.toLowerCase());

  const baseProducts = useMemo(() => {
    if (vistaCatalogo === "catalogo") {
      return products.filter((p) => p.enCatalogo === true);
    }
    return products;
  }, [products, vistaCatalogo]);

  const productsForBrandsCount = selectedCategory
    ? baseProducts.filter((p) =>
        removeAccents(p.categories?.name?.toLowerCase()) === removeAccents(selectedCategory.toLowerCase())
      ).length
    : baseProducts.length;

  const uniqueBrands = useMemo(() => {
    const productsForBrands = selectedCategory
      ? baseProducts.filter((p) => 
          removeAccents(p.categories?.name?.toLowerCase()) === removeAccents(selectedCategory.toLowerCase()))
      : baseProducts;

    const brands = {};
    productsForBrands.forEach((p) => {
      if (p.brands?.id && p.brands?.name) {
        if (!brands[p.brands.id]) {
          brands[p.brands.id] = { name: p.brands.name, count: 0 };
        }
        brands[p.brands.id].count++;
      }
    });
    return Object.entries(brands)
      .map(([id, data]) => ({ id: parseInt(id), ...data }))
      .filter(b => b.count > 0)
      .sort((a, b) => {
        if (brandSortBy === "name-asc") return a.name.localeCompare(b.name);
        if (brandSortBy === "name-desc") return b.name.localeCompare(a.name);
        if (brandSortBy === "count-asc") return a.count - b.count;
        return b.count - a.count;
      });
  }, [baseProducts, selectedCategory, brandSortBy]);

  const subcategoriesForCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = categories.find(c => c.name === selectedCategory);
    if (!cat) return [];
    const subcatMap = {};
    baseProducts.forEach(p => {
      if (p.category_id === cat.id && p.subcategories?.id) {
        const s = p.subcategories;
        subcatMap[s.id] = { id: s.id, nombre: s.name, name: s.name, category_id: cat.id };
      }
    });
    return Object.values(subcatMap);
  }, [selectedCategory, categories, baseProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (vistaCatalogo === "catalogo") {
      filtered = filtered.filter((p) => p.enCatalogo === true);
    }

    if (filtroPeso) {
      filtered = filtered.filter((p) => p.type_unit === "weight");
    }

    if (filtroEnUso === "enUso") {
      filtered = filtered.filter((p) => p.enUso === true);
    } else if (filtroEnUso === "sinUsar") {
      filtered = filtered.filter((p) => p.enUso !== true);
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => 
        removeAccents(p.categories?.name?.toLowerCase()) === removeAccents(selectedCategory.toLowerCase())
      );
    }

    if (selectedBrand) {
      filtered = filtered.filter((p) => p.brands?.id === parseInt(selectedBrand));
    }

    if (search) {
      const lower = normalizeSearch;
      filtered = filtered.filter(
        (p) =>
          removeAccents(p.name.toLowerCase()).includes(lower) ||
          removeAccents(p.brands?.name?.toLowerCase()).includes(lower) ||
          removeAccents(p.categories?.name?.toLowerCase()).includes(lower) ||
          p.id?.toString().includes(search)
      );
    }

    return filtered;
  }, [products, search, selectedCategory, selectedBrand, filtroPeso, filtroEnUso, vistaCatalogo]);

  const productsWithSubcatFilter = useMemo(() => {
    if (!selectedSubcategory) return filteredProducts;
    return filteredProducts.filter((p) => p.subcategory_id === parseInt(selectedSubcategory));
  }, [filteredProducts, selectedSubcategory]);

  const handleSelectCategory = (catName) => {
    setSelectedCategory(catName);
    setSelectedSubcategory("");
  };

  const handleClearAll = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedBrand("");
    setFiltroPeso(false);
    setFiltroEnUso("todos");
  };

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";
  const rowHover = dark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  const hasActiveFilters = selectedCategory || selectedSubcategory || selectedBrand || search || filtroPeso || filtroEnUso !== "todos" || vistaCatalogo === "catalogo";

    return (
      <div className="space-y-4">
        {/* TABS: Mi catálogo / Completo */}
        {tieneCatalogoDefinido && (
          <div className={`flex gap-1 p-1 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
            <button
              onClick={() => setVistaCatalogo("catalogo")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                vistaCatalogo === "catalogo"
                  ? "bg-blue-500 text-white shadow"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              📋 Mi catálogo ({products.filter(p => p.enCatalogo).length})
            </button>
            <button
              onClick={() => setVistaCatalogo("completo")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                vistaCatalogo === "completo"
                  ? "bg-blue-500 text-white shadow"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              🌐 Catálogo completo ({products.length})
            </button>
          </div>
        )}

        {/* SEARCH */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, marca o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full px-4 py-3 pl-11 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-blue-500/50 ${inputBg}`}
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-gray-400">🔍</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${dark ? "hover:bg-gray-600" : "hover:bg-gray-200"} text-gray-400 hover:text-gray-600 transition-colors`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

      {/* WEIGHT FILTER */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium ${textSecondary}`}>⚖️ TIPO:</span>
        <button
          onClick={() => setFiltroPeso(!filtroPeso)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filtroPeso
              ? "bg-blue-500 text-white"
              : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {filtroPeso ? "Por peso (kg)" : "Todos"}
        </button>
        
        <span className={`text-xs font-medium ${textSecondary} ml-2`}>📦 ESTADO:</span>
        <button
          onClick={() => setFiltroEnUso("todos")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filtroEnUso === "todos"
              ? "bg-green-500 text-white"
              : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFiltroEnUso("enUso")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filtroEnUso === "enUso"
              ? "bg-green-500 text-white"
              : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ✓ En uso
        </button>
        <button
          onClick={() => setFiltroEnUso("sinUsar")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filtroEnUso === "sinUsar"
              ? "bg-green-500 text-white"
              : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Sin usar
        </button>
      </div>

      {/* BRAND QUICK FILTER BAR */}
      {uniqueBrands.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-medium">🏷️ FILTRAR POR MARCA</span>
            <div className="flex gap-1">
              {[["count-desc", "▼"], ["count-asc", "▲"], ["name-asc", "A-Z"], ["name-desc", "Z-A"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setBrandSortBy(key)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                    brandSortBy === key
                      ? "bg-blue-500 text-white"
                      : dark ? "hover:bg-gray-700" : "hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedBrand && (
              <button onClick={() => setSelectedBrand("")} className="text-xs text-blue-500 hover:underline">
                Limpiar marca
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedBrand("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                !selectedBrand
                  ? dark ? "bg-gray-600 text-white" : "bg-gray-800 text-white"
                  : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todas ({productsForBrandsCount})
            </button>
            {uniqueBrands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrand(selectedBrand === brand.id ? "" : brand.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  selectedBrand === brand.id
                    ? "bg-blue-500 text-white shadow-lg"
                    : dark
                      ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                {brand.name} ({brand.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY + SUBCATEGORY FILTER BAR */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-medium">📁 FILTRAR POR CATEGORÍA</span>
            {selectedCategory && (
              <button onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); }} className="text-xs text-purple-500 hover:underline">
                Limpiar categoría
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleSelectCategory("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                !selectedCategory
                  ? dark ? "bg-gray-600 text-white" : "bg-gray-800 text-white"
                  : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todas
            </button>
            {categories
              .map((cat) => {
                const count = baseProducts.filter((p) => p.categories?.name === cat.name).length;
                return { ...cat, count };
              })
              .filter(cat => cat.count > 0)
              .map((cat) => {
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === cat.name
                      ? "bg-purple-500 text-white shadow-lg"
                      : dark
                        ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBCATEGORY FILTER BAR */}
      {subcategoriesForCategory.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-medium">📂 FILTRAR POR SUBCATEGORÍA</span>
            {selectedSubcategory && (
              <button onClick={() => setSelectedSubcategory("")} className="text-xs text-green-500 hover:underline">
                Limpiar subcategoría
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedSubcategory("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                !selectedSubcategory
                  ? dark ? "bg-gray-600 text-white" : "bg-gray-800 text-white"
                  : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todas
            </button>
            {subcategoriesForCategory
              .map((sub) => ({ ...sub, count: filteredProducts.filter((p) => p.subcategory_id === sub.id).length }))
              .filter(sub => sub.count > 0)
              .map((sub) => {
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(selectedSubcategory === sub.id ? "" : sub.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    selectedSubcategory === sub.id
                      ? "bg-green-500 text-white shadow-lg"
                      : dark
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-green-50 text-green-600 hover:bg-green-100"
                  }`}
                >
                  {sub.nombre || sub.name} ({sub.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE FILTERS BADGES + CLEAR */}
      {hasActiveFilters && (
        <div className={`p-2 rounded-lg flex items-center justify-between ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          <div className="flex flex-wrap gap-2">
            {vistaCatalogo === "catalogo" && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                📋 Mi catálogo
              </span>
            )}
            {filtroPeso && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                ⚖️ Por peso (kg)
              </span>
            )}
            {filtroEnUso !== "todos" && (
              <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                📦 {filtroEnUso === "enUso" ? "En uso" : "Sin usar"}
              </span>
            )}
            {selectedCategory && (
              <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                📁 {selectedCategory}
              </span>
            )}
            {selectedSubcategory && (
              <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                📂 {subcategoriesForCategory.find(s => s.id === parseInt(selectedSubcategory))?.nombre || "Subcategoría"}
              </span>
            )}
            {selectedBrand && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                🏷️ {uniqueBrands.find(b => b.id === parseInt(selectedBrand))?.name}
              </span>
            )}
          </div>
          <button
            onClick={handleClearAll}
            className={`text-xs px-2 py-1 rounded-lg ${dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500"}`}
          >
            ✕ Limpiar
          </button>
        </div>
      )}

      {/* RESULTS COUNT */}
      <div className="flex items-center justify-between">
        <span className={`text-sm ${textSecondary}`}>
          {productsWithSubcatFilter.length} productos
          {vistaCatalogo === "completo" && tieneCatalogoDefinido && (
            <span className="ml-1 text-xs">
              ({products.filter(p => p.enCatalogo).length} en catálogo)
            </span>
          )}
          {hasActiveFilters && <span className="ml-1 text-xs">(de {vistaCatalogo === "catalogo" ? products.filter(p => p.enCatalogo).length : products.length})</span>}
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="text-xs text-blue-500 hover:underline"
          >
            Ver todos
          </button>
        )}
      </div>

      {/* PRODUCTS LIST */}
      <div className={`rounded-xl border overflow-hidden ${borderColor}`}>
        {productsWithSubcatFilter.length === 0 ? (
          <div className={`p-6 text-center ${textSecondary}`}>
            <div className="text-4xl mb-2">🔍</div>
            <p>No se encontraron productos</p>
            {hasActiveFilters && (
              <button onClick={handleClearAll} className="mt-2 text-blue-500 hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
              {productsWithSubcatFilter.map((p) => {
              const subcat = p.subcategories;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col md:flex-row md:justify-between md:items-center px-3 md:px-4 py-3 text-sm ${rowHover}`}
                >
                    <div className="flex gap-2 md:gap-3 items-start md:items-center mb-2 md:mb-0 min-w-0 flex-1">
                    <span className={`text-xs ${textSecondary} shrink-0 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded`}>#{p.id}</span>
                    {p.enUso && (
                      <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded ${dark ? "bg-green-500/30 text-green-400" : "bg-green-100 text-green-700"}`}>
                        ✓
                      </span>
                    )}
                    {!p.enCatalogo && vistaCatalogo === "completo" && (
                      <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded ${dark ? "bg-yellow-500/30 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>
                        ⚠️
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${textPrimary}`}>{p.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.brands?.name && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                            🏷️ {p.brands.name}
                          </span>
                        )}
                        {p.categories?.name && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                            📁 {p.categories.name}
                          </span>
                        )}
                        {p.type_unit === "weight" && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-50 text-yellow-600"}`}>
                            ⚖️ Por peso (kg)
                          </span>
                        )}
                        {subcat && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600"}`}>
                            📂 {subcat.nombre || subcat.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
