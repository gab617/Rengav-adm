import { useState, useEffect } from "react";
import { useAdminBrands } from "../../../hooksAdmin/useAdminBrands";
import { useAdminCategories } from "../../../hooksAdmin/useAdminCategories";

export function FormNewBaseProduct() {
  const { categories } = useAdminCategories();
  const {
    getBrandsByCategory,
    createBrand,
    linkBrandToCategory,
  } = useAdminBrands();

  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");

  const brandsForCategory = getBrandsByCategory(Number(categoryId));

  // 🔹 Crear nueva marca y vincularla automáticamente
  const handleCreateBrand = async () => {
    if (!newBrandName || !categoryId) return;

    const brand = await createBrand(newBrandName);
    await linkBrandToCategory(brand.id, Number(categoryId));

    setBrandId(brand.id);
    setNewBrandName("");
  };

  return (
    <div className="space-y-4">

      {/* CATEGORIA */}
      <div>
        <label>Categoría</label>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setBrandId("");
          }}
          className="border p-2 w-full"
        >
          <option value="">Seleccionar categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* MARCA */}
      <div>
        <label>Marca</label>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="border p-2 w-full"
          disabled={!categoryId}
        >
          <option value="">Seleccionar marca</option>
          {brandsForCategory.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {/* CREAR NUEVA MARCA */}
      {categoryId && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nueva marca"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            className="border p-2 flex-1"
          />
          <button
            type="button"
            onClick={handleCreateBrand}
            className="bg-blue-600 text-white px-4"
          >
            Crear
          </button>
        </div>
      )}

    </div>
  );
}