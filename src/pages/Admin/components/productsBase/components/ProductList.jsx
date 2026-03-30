import { useMemo, useState } from "react";
import { useAppContext } from "../../../../../contexto/Context";

export function ProductList({ products = [], categories = [], subcategories = [] }) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  const uniqueBrands = useMemo(() => {
    const brands = {};
    products.forEach((p) => {
      if (p.brands?.id && p.brands?.name) {
        if (!brands[p.brands.id]) {
          brands[p.brands.id] = { name: p.brands.name, count: 0 };
        }
        brands[p.brands.id].count++;
      }
    });
    return Object.entries(brands)
      .map(([id, data]) => ({ id: parseInt(id), ...data }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const subcategoriesForCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = categories.find(c => c.name === selectedCategory);
    if (!cat) return [];
    return subcategories.filter(s => s.category_id === cat.id || s.id_categoria === cat.id);
  }, [selectedCategory, categories, subcategories]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categories?.name === selectedCategory);
    }

    if (selectedSubcategory) {
      filtered = filtered.filter((p) => p.subcategory_id === parseInt(selectedSubcategory));
    }

    if (selectedBrand) {
      filtered = filtered.filter((p) => p.brands?.id === parseInt(selectedBrand));
    }

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.brands?.name?.toLowerCase().includes(lower) ||
          p.id?.toString().includes(search)
      );
    }

    return filtered;
  }, [products, search, selectedCategory, selectedSubcategory, selectedBrand]);

  const handleSelectCategory = (catName) => {
    setSelectedCategory(catName);
    setSelectedSubcategory("");
  };

  const handleClearAll = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedBrand("");
  };

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";
  const rowHover = dark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  const hasActiveFilters = selectedCategory || selectedSubcategory || selectedBrand || search;

  return (
    <div className="space-y-4">
      {/* SEARCH */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full px-3 py-2.5 pl-10 rounded-lg border text-sm ${inputBg}`}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        {search && (
          <button
            onClick={() => setSearch("")}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary} hover:text-gray-600`}
          >
            ✕
          </button>
        )}
      </div>

      {/* BRAND QUICK FILTER BAR */}
      {uniqueBrands.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-medium">🏷️ FILTRAR POR MARCA</span>
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
              Todas ({products.length})
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
            {categories.map((cat) => {
              const count = products.filter((p) => p.categories?.name === cat.name).length;
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
                  {cat.name} ({count})
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
            {subcategoriesForCategory.map((sub) => {
              const count = filteredProducts.filter((p) => p.subcategory_id === sub.id).length;
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
                  {sub.nombre || sub.name} ({count})
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
          {filteredProducts.length} productos
          {hasActiveFilters && <span className="ml-1 text-xs">(de {products.length})</span>}
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
        {filteredProducts.length === 0 ? (
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
            {filteredProducts.map((p) => {
              const subcat = subcategories.find(s => s.id === p.subcategory_id);
              return (
                <div
                  key={p.id}
                  className={`flex flex-col md:flex-row md:justify-between md:items-center px-3 md:px-4 py-3 text-sm ${rowHover}`}
                >
                  <div className="flex gap-2 md:gap-3 items-start md:items-center mb-2 md:mb-0 min-w-0 flex-1">
                    <span className={`text-xs ${textSecondary} shrink-0 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded`}>#{p.id}</span>
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
