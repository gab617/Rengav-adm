import React, { useMemo, useState } from "react";
import { useAdminProductsBase } from "../../hooksAdmin/useAdminProductsBase";
import { useAdminCategories } from "../../hooksAdmin/useAdminCategories";
import { useAdminBrands } from "../../hooksAdmin/useAdminBrands";
import { ProductList } from "./components/ProductList";
import { useAppContext } from "../../../../contexto/Context";

export function ProductsBase() {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const { products, loading, creating, createProductBase } = useAdminProductsBase();
  const { categories, getSubcategoriesByCategory } = useAdminCategories();
  const { getBrandsByCategory, createBrand, linkBrandToCategory } = useAdminBrands();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filteredSubcategories = useMemo(() => {
    if (!categoryId) return [];
    return getSubcategoriesByCategory(categoryId);
  }, [categoryId, getSubcategoriesByCategory]);

  const filteredBrands = useMemo(() => {
    if (!categoryId) return [];
    return getBrandsByCategory(Number(categoryId));
  }, [categoryId, getBrandsByCategory]);

  async function handleCreateBrand() {
    if (!newBrandName || !categoryId) return;
    try {
      const brand = await createBrand(newBrandName);
      await linkBrandToCategory(brand.id, Number(categoryId));
      setBrandId(brand.id);
      setNewBrandName("");
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createProductBase({
        name,
        category_id: Number(categoryId),
        subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        brand_id: brandId ? Number(brandId) : null,
      });
      setName("");
      setCategoryId("");
      setSubcategoryId("");
      setBrandId("");
      setNewBrandName("");
      setShowForm(false);
    } catch (err) {
      alert(err.message);
    }
  }

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";

  const stats = useMemo(() => {
    const brands = new Set();
    const cats = new Set();
    products.forEach(p => {
      if (p.brands?.id) brands.add(p.brands.id);
      if (p.categories?.name) cats.add(p.categories.name);
    });
    return { total: products.length, brands: brands.size, categories: cats.size };
  }, [products]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <span className="animate-pulse">Cargando productos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>
            📦 Productos Base
          </h1>
          <div className="flex gap-3 mt-1">
            <span className={`text-xs ${textSecondary}`}>{stats.total} productos</span>
            <span className={`text-xs ${textSecondary}`}>·</span>
            <span className={`text-xs ${textSecondary}`}>{stats.brands} marcas</span>
            <span className={`text-xs ${textSecondary}`}>·</span>
            <span className={`text-xs ${textSecondary}`}>{stats.categories} categorías</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            showForm
              ? dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {showForm ? "✕ Cerrar" : "+ Nuevo producto"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className={`space-y-4 p-4 rounded-xl border ${bgCard}`}
        >
          <h2 className={`font-semibold text-lg ${textPrimary}`}>➕ Agregar Producto Base</h2>

          <div className="relative">
            <input
              type="text"
              placeholder="Nombre del producto (ej: Oreo 118g)"
              className={`w-full px-3 py-3 rounded-lg border text-sm ${inputBg}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
              setBrandId("");
            }}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
            required
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg} ${!categoryId ? "opacity-50" : ""}`}
            disabled={!categoryId}
          >
            <option value="">
              {categoryId ? "Seleccionar subcategoría" : "Elegir categoría primero"}
            </option>
            {filteredSubcategories.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg} ${!categoryId ? "opacity-50" : ""}`}
            disabled={!categoryId}
          >
            <option value="">
              {categoryId ? "Seleccionar marca" : "Elegir categoría primero"}
            </option>
            {filteredBrands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {categoryId && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva marca"
                className={`flex-1 px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
              <button
                type="button"
                onClick={handleCreateBrand}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500"
              >
                Crear
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
          >
            {creating ? "Creando..." : "Crear producto"}
          </button>
        </form>
      )}

      <div className={`rounded-xl border overflow-hidden ${bgCard}`}>
        <ProductList products={products} categories={categories} />
      </div>
    </div>
  );
}
