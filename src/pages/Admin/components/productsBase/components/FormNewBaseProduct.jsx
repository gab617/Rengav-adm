import { useState } from "react";
import { supabase } from "../../../../services/supabaseClient";
import { useAdminBrands } from "../../../hooksAdmin/useAdminBrands";
import { useAdminCategories } from "../../../hooksAdmin/useAdminCategories";

export function FormNewBaseProduct({ onClose }) {
  const { categories } = useAdminCategories();
  const {
    getBrandsByCategory,
    createBrand,
    linkBrandToCategory,
  } = useAdminBrands();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [typeUnit, setTypeUnit] = useState("unit"); // unit o weight

  const brandsForCategory = getBrandsByCategory(Number(categoryId));

  // 🔹 Crear nueva marca y vincularla automáticamente
  const handleCreateBrand = async () => {
    if (!newBrandName || !categoryId) return;

    const brand = await createBrand(newBrandName);
    await linkBrandToCategory(brand.id, Number(categoryId));

    setBrandId(brand.id);
    setNewBrandName("");
  };

  // 🔹 Guardar nuevo producto base
  const handleSave = async () => {
    if (!name || !categoryId || !brandId) {
      alert("Completá todos los campos");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("products_base").insert({
      name,
      category_id: Number(categoryId),
      brand_id: Number(brandId),
      type_unit: typeUnit,
    });
    setLoading(false);

    if (error) {
      alert("Error: " + error.message);
    } else {
      onClose?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* NOMBRE */}
      <div>
        <label>Nombre del producto</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Queso rallado"
          className="border p-2 w-full"
        />
      </div>

      {/* TIPO DE VENTA */}
      <div>
        <label>Tipo de venta</label>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setTypeUnit("unit")}
            className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
              typeUnit === "unit"
                ? "bg-blue-500 text-white border-blue-500"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            📦 Por unidad
          </button>
          <button
            type="button"
            onClick={() => setTypeUnit("weight")}
            className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
              typeUnit === "weight"
                ? "bg-blue-500 text-white border-blue-500"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            ⚖️ Por peso (balanza)
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {typeUnit === "weight" 
            ? "El cliente deberá pesar el producto en el carrito" 
            : "El cliente compra cantidad entera"}
        </p>
      </div>

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

      {/* GUARDAR */}
      <button
        onClick={handleSave}
        disabled={loading || !name || !categoryId || !brandId}
        className="w-full bg-green-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? "Guardando..." : "✓ Guardar producto"}
      </button>
    </div>
  );
}