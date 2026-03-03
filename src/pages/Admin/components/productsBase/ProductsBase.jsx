import React, { useMemo, useState } from "react";
import { useAdminProductsBase } from "../../hooksAdmin/useAdminProductsBase";
import { useAdminCategories } from "../../hooksAdmin/useAdminCategories";
import { useAdminBrands } from "../../hooksAdmin/useAdminBrands";
import { ProductList } from "./components/ProductList";

export function ProductsBase() {
  const { products, loading, creating, createProductBase } =
    useAdminProductsBase();

  const { categories, getSubcategoriesByCategory } =
    useAdminCategories();

  const {
    getBrandsByCategory,
    createBrand,
    linkBrandToCategory,
  } = useAdminBrands();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");

  // 🔹 Subcategorías filtradas en memoria
  const filteredSubcategories = useMemo(() => {
    if (!categoryId) return [];
    return getSubcategoriesByCategory(categoryId);
  }, [categoryId, getSubcategoriesByCategory]);

  // 🔹 Marcas filtradas en memoria
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
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div className="space-y-6">

      <h1 className="text-xl font-semibold">
        Cantidad de productos en base de datos: {products.length}
      </h1>

      {/* 🔹 Formulario */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3 border p-4 rounded bg-white"
      >
        <h2 className="font-medium">Agregar Producto Base</h2>

        {/* Nombre */}
        <input
          type="text"
          placeholder="Nombre completo (ej: Oreo 118g)"
          className="w-full border px-3 py-2 rounded text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Categoría */}
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubcategoryId("");
            setBrandId("");
          }}
          className="w-full border px-3 py-2 rounded text-sm"
          required
        >
          <option value="">Seleccionar categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Subcategoría */}
        <select
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
          className="w-full border px-3 py-2 rounded text-sm"
          disabled={!categoryId}
        >
          <option value="">
            {categoryId
              ? "Seleccionar subcategoría"
              : "Elegir categoría primero"}
          </option>

          {filteredSubcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Marca */}
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="w-full border px-3 py-2 rounded text-sm"
          disabled={!categoryId}
        >
          <option value="">
            {categoryId
              ? "Seleccionar marca"
              : "Elegir categoría primero"}
          </option>

          {filteredBrands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Crear nueva marca */}
        {categoryId && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva marca"
              className="flex-1 border px-3 py-2 rounded text-sm"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
            />
            <button
              type="button"
              onClick={handleCreateBrand}
              className="bg-gray-800 text-white px-3 rounded text-sm hover:opacity-80"
            >
              Crear
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={creating}
          className="bg-black text-white px-4 py-2 rounded text-sm hover:opacity-80 disabled:opacity-50"
        >
          {creating ? "Creando..." : "Crear producto"}
        </button>
      </form>

      {/* 🔹 Lista */}
      <div>
        <ProductList products={products} />
      </div>

    </div>
  );
}