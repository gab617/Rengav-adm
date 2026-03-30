import React, { useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";

export function EditProduct({
  editedProduct,
  handleChange,
  handleSubmit,
  handleCancel,
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const precioVenta = parseFloat(editedProduct.precio_venta) || 0;
  const precioCompra = parseFloat(editedProduct.precio_compra) || 0;
  const ganancia = precioVenta - precioCompra;
  const ventaMenorQueCompra = precioVenta > 0 && precioCompra > 0 && precioCompra > precioVenta;

  const bg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    : "bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const inputDisabledBg = dark
    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
    : "bg-gray-200 text-gray-600 cursor-not-allowed";
  const btnSave = ventaMenorQueCompra
    ? dark
      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"
    : dark
      ? "bg-green-600 hover:bg-green-500 text-white"
      : "bg-green-500 hover:bg-green-600 text-white";
  const btnCancel = dark
    ? "bg-red-700 hover:bg-red-600 text-white"
    : "bg-red-600 hover:bg-red-500 text-white";

  return (
    <div
      className={`
        fixed w-100 inset-0 z-[100] flex items-center justify-center bg-black/60
        md:absolute md:inset-auto md:z-50 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:bg-transparent md:bg-black/40 md:backdrop-blur-sm
      `}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        className={`rounded-2xl bgb border shadow-2xl p-4 w-[90%] max-w-md ${bg} transform-none!`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Editar Producto</h3>
          <button
            onClick={handleCancel}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
              ${dark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"}`}
          >
            
          </button>
        </div>

        <label className="block text-sm font-semibold mb-1">Nombre (base)</label>
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
          className={`w-full p-2 border rounded mb-3 ${
            editedProduct.tipo !== "custom" ? inputDisabledBg : inputBg
          }`}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Precio venta $</label>
            <input
              type="number"
              name="precio_venta"
              value={editedProduct.precio_venta}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${inputBg}`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Precio compra $</label>
            <input
              type="number"
              name="precio_compra"
              value={editedProduct.precio_compra}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${inputBg}`}
            />
          </div>
        </div>

        {ventaMenorQueCompra && (
          <div className={`mt-3 p-3 rounded-xl border-2 ${
            dark ? "bg-red-900/30 border-red-500" : "bg-red-50 border-red-400"
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className={`font-semibold text-sm ${dark ? "text-red-400" : "text-red-600"}`}>
                  Ganancia negativa
                </p>
                <p className={`text-xs mt-1 ${dark ? "text-red-300" : "text-red-500"}`}>
                  El precio de venta (${precioVenta.toLocaleString()}) es menor al de compra (${precioCompra.toLocaleString()}).
                  <br />
                  <span className="font-medium">Ganancia por unidad: -${Math.abs(ganancia).toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {!ventaMenorQueCompra && precioVenta > 0 && precioCompra > 0 && (
          <div className={`mt-3 p-2 rounded-lg text-center ${
            dark ? "bg-green-900/30" : "bg-green-50"
          }`}>
            <p className={`text-sm font-medium ${dark ? "text-green-400" : "text-green-600"}`}>
              ✓ Ganancia: ${ganancia.toLocaleString()} por unidad
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Stock</label>
            <input
              type="number"
              name="stock"
              value={editedProduct.stock}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${inputBg}`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Proveedor</label>
            <input
              type="text"
              name="proveedor_nombre"
              value={editedProduct.proveedor_nombre}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${inputBg}`}
            />
          </div>
        </div>

        <label className="block text-sm font-semibold mt-3 mb-1">Descripción</label>
        <textarea
          name="descripcion"
          value={editedProduct.descripcion}
          onChange={handleChange}
          rows={2}
          className={`w-full p-2 border rounded mb-4 ${inputBg}`}
        />

        <div className="flex gap-2 mt-2">
          <button
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${btnSave}`}
            onClick={handleSubmit}
            disabled={ventaMenorQueCompra}
          >
            {ventaMenorQueCompra ? "⚠️ Corregir precios" : "💾 Guardar"}
          </button>

          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${btnCancel}`}
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
