import React from "react";
import { obtenerProductoMasVendido } from "../functions";

export function ProductoMasVendido({ ventas = [] }) {
  // Filtrar ventas y productos válidos antes de llamar a la función contarProductos
  const ventasValidas = ventas.filter(
    (venta) =>
      venta.productos &&
      Array.isArray(venta.productos) &&
      venta.productos.every(
        (producto) =>
          producto &&
          producto.producto &&
          producto.cantidad !== undefined &&
          producto.total !== undefined
      )
  );

  // Obtener el producto más vendido solo si hay ventas válidas
  const productoMasVendido = obtenerProductoMasVendido(ventasValidas);

  return (
    <div className="">
      {/* Asegurarse de que el producto más vendido exista antes de mostrar */}
      {productoMasVendido ? (
        <div className="bg-purple-50  rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold  text-center text-purple-600 mb-4">
            📦 Producto Más Vendido
          </h2>
          <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
            <p className="text-2xl font-bold text-gray-700">
              {productoMasVendido.producto}
            </p>

            <div className="flex justify-between">
              <p className="text-lg font-semibold text-gray-800">
                Cantidad Vendida:
              </p>
              <p className="text-xl font-medium text-gray-700">
                {productoMasVendido.cantidad}
              </p>
            </div>

            <div className="flex justify-between">
              <p className="text-lg font-semibold text-gray-800">
                Precio Unitario:
              </p>
              <p className="text-xl font-medium text-gray-700">
                $
                {productoMasVendido.precio_unitario
                  .toFixed(2)
                  .replace(/\.00$/, "")
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </p>
            </div>

            <div className="flex justify-between">
              <p className="text-lg font-semibold text-gray-800">Total:</p>
              <p className="text-xl font-medium text-gray-700">
                $
                {productoMasVendido.total
                  .toFixed(2)
                  .replace(/\.00$/, "")
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </p>
            </div>

            <div className="flex gap-1 items-center">
              <p className="text-lg font-semibold text-gray-800">Ganancia:</p>
              <p className="text-xl font-bold text-green-700 bg-green-100 p-2 rounded-lg border-2 border-green-600 shadow-md text-center">
                $
                {(productoMasVendido.cantidad * productoMasVendido.ganancia)
                  .toFixed(2)
                  .replace(/\.00$/, "")
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p>
          No hay ventas registradas o no se puede determinar el producto más
          vendido.
        </p>
      )}
    </div>
  );
}
