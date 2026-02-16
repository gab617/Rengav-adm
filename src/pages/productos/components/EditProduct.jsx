import React from "react";
import { useAppContext } from "../../../contexto/Context";

export function EditProduct({
  editedProduct,
  handleChange,
  handleSubmit,
  handleCancel,
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const esMobile = window.innerWidth < 768;

  // Colores según el theme
  const bg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const inputDisabledBg = dark
    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
    : "bg-gray-200 text-gray-600 cursor-not-allowed";
  const btnSave = dark
    ? "bg-green-600 hover:bg-green-500 text-white"
    : "bg-green-500 hover:bg-green-600 text-white";
  const btnCancel = dark
    ? "bg-red-700 hover:bg-red-600 text-white"
    : "bg-red-600 hover:bg-red-500 text-white";

  return (
    <div
      className={`
    ${
      esMobile
        ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        : "absolute bottom-[-10em] mt-2 z-10"
    }
  `}
    >
      <div
        className={`rounded-2xl border shadow-2xl p-4 w-[90%] max-w-md ${bg}`}
      >
        <h3 className="text-lg font-semibold mb-2">Editar Producto</h3>

        {/* Nombre SOLO LECTURA */}
        <label className="block text-sm font-semibold">Nombre (base)</label>
        <input
          type="text"
          name="nombre"
          value={
            editedProduct.tipo === "custom"
              ? editedProduct.nombre || editedProduct.products_base?.name || ""
              : editedProduct.products_base?.name || ""
          }
          disabled={editedProduct.tipo !== "custom"}
          onChange={editedProduct.tipo === "custom" ? handleChange : undefined}
          className={`w-full p-1 border rounded mb-2 ${
            editedProduct.tipo !== "custom" ? inputDisabledBg : inputBg
          }`}
        />

        <label className="block text-sm font-semibold">Precio de venta $</label>
        <input
          type="number"
          name="precio_venta"
          value={editedProduct.precio_venta}
          onChange={handleChange}
          className={`w-full p-1 border rounded mb-2 ${inputBg}`}
        />

        <label className="block text-sm font-semibold">Precio Compra $</label>
        <input
          type="number"
          name="precio_compra"
          value={editedProduct.precio_compra}
          onChange={handleChange}
          className={`w-full p-1 border rounded mb-2 ${inputBg}`}
        />

        <label className="block text-sm font-semibold">Stock</label>
        <input
          type="number"
          name="stock"
          value={editedProduct.stock}
          onChange={handleChange}
          className={`w-full p-1 border rounded mb-2 ${inputBg}`}
        />

        <label className="block text-sm font-semibold">Descripción</label>
        <textarea
          name="descripcion"
          value={editedProduct.descripcion}
          onChange={handleChange}
          className={`w-full p-1 border rounded mb-2 ${inputBg}`}
        />

        <label className="block text-sm font-semibold">Proveedor</label>
        <input
          type="text"
          name="proveedor_nombre"
          value={editedProduct.proveedor_nombre}
          onChange={handleChange}
          className={`w-full p-1 border rounded mb-2 ${inputBg}`}
        />

        <div className="flex justify-between mt-2">
          <button
            className={`cursor-pointer px-3 py-1 rounded ${btnSave}`}
            onClick={handleSubmit}
          >
            💾 Guardar
          </button>

          <button
            className={`border  p-1 rounded-lg cursor-pointer ${btnCancel}`}
            onClick={handleCancel}
          >
            ❌ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
