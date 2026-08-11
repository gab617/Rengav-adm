import { useMemo, useState, useRef } from "react";
import { useAppContext } from "../../../../../contexto/Context";
import { supabase } from "../../../../../services/supabaseClient";
import { toast } from "react-toastify";

export function ProductList({ products = [], categories = [], subcategories = [], tieneCatalogoDefinido = false, baseGallery = {}, tenantGallery = {}, brands = [], getBrandsByCategory = () => [], updateProductBase }) {
  const { preferencias, profile } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const esSuperAdmin = profile?.role === "super_admin";
  const esAdminTenant = profile?.role === "admin" || profile?.role === "user";
  const puedeVerModal = esSuperAdmin || esAdminTenant;
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [filtroPeso, setFiltroPeso] = useState(false);
  const [filtroEnUso, setFiltroEnUso] = useState("todos");
  const [vistaCatalogo, setVistaCatalogo] = useState(esSuperAdmin ? "completo" : "catalogo");
  const [brandSortBy, setBrandSortBy] = useState("count-desc");

  const [editingBase, setEditingBase] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editSubcategoryId, setEditSubcategoryId] = useState("");
  const [editBrandId, setEditBrandId] = useState("");
  const [editTypeUnit, setEditTypeUnit] = useState("unit");
  const [editNewImage, setEditNewImage] = useState(null);
  const [editRemoveImage, setEditRemoveImage] = useState(false);
  const [savingBase, setSavingBase] = useState(false);
  const [lightboxBase, setLightboxBase] = useState(null);
  const editFileInputRef = useRef(null);

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
  }, [products, search, normalizeSearch, selectedCategory, selectedBrand, filtroPeso, filtroEnUso, vistaCatalogo]);

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

  const publicUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const openEditBase = (p) => {
    setEditingBase(p);
    setEditName(p.name);
    setEditCategoryId(p.category_id ? String(p.category_id) : "");
    setEditSubcategoryId(p.subcategory_id ? String(p.subcategory_id) : "");
    setEditBrandId(p.brand_id ? String(p.brand_id) : "");
    setEditTypeUnit(p.type_unit || "unit");
    setEditNewImage(null);
    setEditRemoveImage(false);
  };

  const closeEditBase = () => {
    if (savingBase) return;
    setEditingBase(null);
    setEditNewImage(null);
    setEditRemoveImage(false);
  };

  const editSubcatsForCat = useMemo(() => {
    if (!editCategoryId) return [];
    return subcategories.filter(
      (s) => String(s.category_id) === String(editCategoryId)
    );
  }, [editCategoryId, subcategories]);

  const editBrandsForCat = useMemo(() => {
    if (!editCategoryId) return [];
    const marcas = getBrandsByCategory(Number(editCategoryId));
    if (editingBase?.brand_id && !marcas.find((b) => b.id === editingBase.brand_id)) {
      const actual = brands.find((b) => b.id === editingBase.brand_id);
      if (actual) marcas.push(actual);
    }
    return marcas;
  }, [editCategoryId, getBrandsByCategory, editingBase, brands]);

  const editPreviewUrl = useMemo(
    () => (editNewImage ? URL.createObjectURL(editNewImage) : null),
    [editNewImage]
  );

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo no es una imagen");
      return;
    }
    setEditNewImage(file);
    setEditRemoveImage(false);
  };

  const handleEditSave = async () => {
    if (!editingBase || !updateProductBase) return;
    if (!editName.trim() || !editCategoryId) {
      toast.error("Nombre y categoría son obligatorios");
      return;
    }
    setSavingBase(true);
    try {
      await updateProductBase({
        id: editingBase.id,
        name: editName.trim(),
        category_id: editCategoryId,
        subcategory_id: editSubcategoryId || null,
        brand_id: editBrandId || null,
        type_unit: editTypeUnit,
        newImageFile: editNewImage || undefined,
        removeImage: editRemoveImage,
      });
      toast.success("Producto actualizado");
      setEditingBase(null);
      setEditNewImage(null);
      setEditRemoveImage(false);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSavingBase(false);
    }
  };

  const openLightboxBase = (imgs, index) => {
    if (!imgs.length) return;
    setLightboxBase({ imgs, index });
  };

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";
  const rowHover = dark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  const hasActiveFilters = selectedCategory || selectedSubcategory || selectedBrand || search || filtroPeso || filtroEnUso !== "todos" || vistaCatalogo === "catalogo";

    return (
      <div className="space-y-4">
        {/* TABS: Mi catálogo / Completo */}
        {(!esSuperAdmin || tieneCatalogoDefinido) && (
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
              const galeria = baseGallery[p.id] || [];
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
                    {galeria.length > 0 ? (
                      <div className="flex gap-1 flex-wrap shrink-0 max-w-[130px] md:max-w-[170px]">
                        {galeria.slice(0, 6).map((u, i) => (
                          <img
                            key={u}
                            src={publicUrl(u)}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                            onClick={() => openLightboxBase(galeria, i)}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-md object-cover border shrink-0 cursor-pointer transition-transform hover:scale-105"
                            style={{ borderColor: dark ? "#4b5563" : "#e5e7eb" }}
                          />
                        ))}
                        {galeria.length > 6 && (
                          <button
                            type="button"
                            onClick={() => openLightboxBase(galeria, 6)}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-md border flex items-center justify-center text-[10px] shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                            style={{ borderColor: dark ? "#4b5563" : "#e5e7eb", color: dark ? "#9ca3af" : "#6b7280" }}
                          >
                            +{galeria.length - 6}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-lg border shrink-0 flex items-center justify-center text-lg ${dark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"}`}
                      >
                        📦
                      </div>
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
                  {puedeVerModal && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditBase(p)}
                        title={esSuperAdmin ? "Editar producto" : "Ver producto"}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          esSuperAdmin
                            ? dark ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-blue-500 text-white hover:bg-blue-400"
                            : dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {esSuperAdmin ? "✏️ Editar" : "👁️ Ver"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT MODAL (super admin edita; el resto ve datos + imágenes del tenant) */}
      {editingBase && puedeVerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-lg rounded-xl border shadow-xl ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? "border-gray-700" : "border-gray-200"}`}>
              <h3 className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                {esSuperAdmin ? "✏️ Editar producto base" : "👁️ Producto del catálogo"}
              </h3>
              <button
                type="button"
                onClick={closeEditBase}
                className={`text-sm px-2 py-1 rounded-lg ${dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className={`block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  Nombre {esSuperAdmin && "*"}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  readOnly={!esSuperAdmin}
                  disabled={!esSuperAdmin}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                    dark ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300"
                  } ${!esSuperAdmin ? "opacity-70 cursor-not-allowed" : ""}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    Categoría {esSuperAdmin && "*"}
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => {
                      setEditCategoryId(e.target.value);
                      setEditSubcategoryId("");
                      setEditBrandId("");
                    }}
                    disabled={!esSuperAdmin}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      dark ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300"
                    } ${!esSuperAdmin ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    Subcategoría
                  </label>
                  <select
                    value={editSubcategoryId}
                    onChange={(e) => setEditSubcategoryId(e.target.value)}
                    disabled={!esSuperAdmin || !editCategoryId}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      dark ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300"
                    } ${!esSuperAdmin || !editCategoryId ? "opacity-50" : ""}`}
                  >
                    <option value="">{editCategoryId ? "Sin subcategoría" : "Elegir categoría primero"}</option>
                    {editSubcatsForCat.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    Marca
                  </label>
                  <select
                    value={editBrandId}
                    onChange={(e) => setEditBrandId(e.target.value)}
                    disabled={!esSuperAdmin || !editCategoryId}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      dark ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300"
                    } ${!esSuperAdmin || !editCategoryId ? "opacity-50" : ""}`}
                  >
                    <option value="">Sin marca</option>
                    {editBrandsForCat.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    Tipo de venta
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTypeUnit("unit")}
                      disabled={!esSuperAdmin}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                        editTypeUnit === "unit"
                          ? "bg-blue-500 text-white border-blue-500"
                          : dark ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"
                      } ${!esSuperAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      📦 Unidad
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTypeUnit("weight")}
                      disabled={!esSuperAdmin}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                        editTypeUnit === "weight"
                          ? "bg-blue-500 text-white border-blue-500"
                          : dark ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"
                      } ${!esSuperAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      ⚖️ Peso
                    </button>
                  </div>
                </div>
              </div>

              {esSuperAdmin && (
                <div>
                  <label className={`block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    Imagen global del catálogo
                  </label>
                  <p className={`text-[10px] mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    Esta imagen es la default para todos los negocios; las galerías
                    por negocio (user_products.imagenes) la reemplazan en la tienda.
                  </p>

                  {editNewImage ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={editPreviewUrl}
                        alt="Nueva"
                        className="w-16 h-16 rounded-lg object-cover border"
                      />
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs ${dark ? "text-gray-300" : "text-gray-600"}`}>
                          Imagen nueva seleccionada
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditNewImage(null)}
                          className="text-xs text-red-500 hover:underline text-left"
                        >
                          ✕ Descartar nueva
                        </button>
                      </div>
                    </div>
                  ) : editRemoveImage ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/50 bg-red-500/10">
                      <span className="text-xs text-red-500 flex-1">
                        Se quitará la imagen global al guardar.
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditRemoveImage(false)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Deshacer
                      </button>
                    </div>
                  ) : editingBase.image_url ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={publicUrl(editingBase.image_url)}
                        alt="Actual"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                        className="w-16 h-16 rounded-lg object-cover border"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-medium"
                        >
                          📷 Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRemoveImage(true)}
                          className="text-xs text-red-500 hover:underline text-left"
                        >
                          🗑️ Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-blue-500/10 text-blue-500 border-blue-500/50"
                    >
                      📷 Agregar imagen global
                    </button>
                  )}

                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleEditImageChange}
                  />
                </div>
              )}

              <div>
                <label className={`block text-xs font-medium mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  🏪 Imágenes asignadas en mi negocio
                </label>
                <p className={`text-[10px] mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  Las imágenes que este negocio cargó para este producto.
                  {esSuperAdmin && " Estas imágenes pertenecen a cada negocio y no se pueden editar desde acá."}
                </p>

                {(() => {
                  const imgs = tenantGallery[editingBase.id] || [];
                  if (imgs.length === 0) {
                    return (
                      <p className={`text-sm py-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                        Este negocio no asignó imágenes a este producto.
                      </p>
                    );
                  }
                  return (
                    <div className="flex gap-2 flex-wrap">
                      {imgs.map((u, i) => (
                        <img
                          key={u}
                          src={publicUrl(u)}
                          alt=""
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          onClick={() => openLightboxBase(imgs, i)}
                          className="w-16 h-16 rounded-lg object-cover border shrink-0 cursor-pointer transition-transform hover:scale-105"
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className={`px-5 py-4 border-t flex items-center justify-end gap-2 ${dark ? "border-gray-700" : "border-gray-200"}`}>
              <button
                type="button"
                onClick={closeEditBase}
                disabled={savingBase}
                className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                  dark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {esSuperAdmin ? "Cancelar" : "Cerrar"}
              </button>
              {esSuperAdmin && (
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={savingBase}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
                >
                  {savingBase ? "Guardando..." : "💾 Guardar cambios"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxBase && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxBase(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxBase((l) => (l ? { ...l, index: (l.index - 1 + l.imgs.length) % l.imgs.length } : null));
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white text-xl hover:bg-black/80"
          >
            ‹
          </button>
          <img
            src={publicUrl(lightboxBase.imgs[lightboxBase.index])}
            alt=""
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxBase((l) => (l ? { ...l, index: (l.index + 1) % l.imgs.length } : null));
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white text-xl hover:bg-black/80"
          >
            ›
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full">
            {lightboxBase.index + 1} / {lightboxBase.imgs.length}
          </span>
        </div>
      )}
    </div>
  );
}
