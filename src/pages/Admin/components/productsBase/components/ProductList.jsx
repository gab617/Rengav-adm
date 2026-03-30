import { useMemo, useState } from "react";
import { useAppContext } from "../../../../../contexto/Context";

export function ProductList({ products = [], categories = [] }) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showBrandFilter, setShowBrandFilter] = useState(false);

  const uniqueBrands = useMemo(() => {
    const brands = {};
    products.forEach((p) => {
      if (p.brands?.id && p.brands?.name) {
        brands[p.brands.id] = p.brands.name;
      }
    });
    return Object.entries(brands).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categories?.name === selectedCategory);
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
  }, [products, search, selectedCategory, selectedBrand]);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";
  const rowHover = dark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  return (
    <div className="space-y-3">
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
      </div>

      {/* ACTIVE FILTERS BADGES */}
      <div className="flex flex-wrap gap-2">
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory("")}
            className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 flex items-center gap-1 hover:bg-purple-500/30"
          >
            📁 {selectedCategory} ✕
          </button>
        )}
        {selectedBrand && (
          <button
            onClick={() => setSelectedBrand("")}
            className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1 hover:bg-blue-500/30"
          >
            🏷️ {uniqueBrands.find(([id]) => id === selectedBrand)?.[1]} ✕
          </button>
        )}
        {(selectedCategory || selectedBrand) && (
          <button
            onClick={() => { setSelectedCategory(""); setSelectedBrand(""); }}
            className={`px-3 py-1 rounded-full text-xs ${dark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"} hover:opacity-70`}
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* FILTER TOGGLES */}
      <div className="flex gap-2">
        <button
          onClick={() => { setShowCategoryFilter(!showCategoryFilter); setShowBrandFilter(false); }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            showCategoryFilter || selectedCategory
              ? "bg-purple-500 text-white"
              : `${bgCard} ${textSecondary}`
          }`}
        >
          📁 Categorías {selectedCategory && <span className="bg-white/30 px-1.5 rounded text-xs">1</span>}
        </button>
        <button
          onClick={() => { setShowBrandFilter(!showBrandFilter); setShowCategoryFilter(false); }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            showBrandFilter || selectedBrand
              ? "bg-blue-500 text-white"
              : `${bgCard} ${textSecondary}`
          }`}
        >
          🏷️ Marcas {selectedBrand && <span className="bg-white/30 px-1.5 rounded text-xs">1</span>}
        </button>
      </div>

      {/* CATEGORY FILTER */}
      {showCategoryFilter && (
        <div className={`p-3 rounded-lg border ${bgCard} ${borderColor} space-y-1 max-h-48 overflow-y-auto`}>
          <button
            onClick={() => { setSelectedCategory(""); setShowCategoryFilter(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              !selectedCategory ? "bg-purple-500 text-white" : `${rowHover} ${textSecondary}`
            }`}
          >
            Todas ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categories?.name === cat.name).length;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.name); setShowCategoryFilter(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-all ${
                  selectedCategory === cat.name ? "bg-purple-500 text-white" : `${rowHover} ${textSecondary}`
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-xs ${selectedCategory === cat.name ? "text-white/70" : ""}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* BRAND FILTER */}
      {showBrandFilter && (
        <div className={`p-3 rounded-lg border ${bgCard} ${borderColor} space-y-1 max-h-48 overflow-y-auto`}>
          <button
            onClick={() => { setSelectedBrand(""); setShowBrandFilter(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              !selectedBrand ? "bg-blue-500 text-white" : `${rowHover} ${textSecondary}`
            }`}
          >
            Todas ({products.length})
          </button>
          {uniqueBrands.map(([id, name]) => {
            const count = products.filter((p) => p.brands?.id === parseInt(id)).length;
            return (
              <button
                key={id}
                onClick={() => { setSelectedBrand(id); setShowBrandFilter(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-all ${
                  selectedBrand === id ? "bg-blue-500 text-white" : `${rowHover} ${textSecondary}`
                }`}
              >
                <span>{name}</span>
                <span className={`text-xs ${selectedBrand === id ? "text-white/70" : ""}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* RESULTS COUNT */}
      <div className="flex items-center justify-between">
        <span className={`text-sm ${textSecondary}`}>
          {filteredProducts.length} productos
        </span>
        {filteredProducts.length !== products.length && (
          <button
            onClick={() => { setSearch(""); setSelectedCategory(""); setSelectedBrand(""); }}
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
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 md:max-h-96 overflow-y-auto">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className={`flex flex-col md:flex-row md:justify-between md:items-center px-3 md:px-4 py-3 text-sm ${rowHover}`}
              >
                <div className="flex gap-2 md:gap-3 items-start md:items-center mb-2 md:mb-0 min-w-0 flex-1">
                  <span className={`text-xs ${textSecondary} shrink-0`}>#{p.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${textPrimary}`}>{p.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.brands?.name && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                          {p.brands.name}
                        </span>
                      )}
                      {p.categories?.name && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                          {p.categories.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  <span className={`text-xs ${textSecondary} hidden md:block`}>
                    C:{p.category_id || "-"} S:{p.subcategory_id || "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`text-xs text-center ${textSecondary}`}>
        Mostrando {filteredProducts.length} de {products.length} productos
      </div>
    </div>
  );
}
