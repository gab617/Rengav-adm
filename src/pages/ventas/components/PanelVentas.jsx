import React from "react";
import { ProductoMasVendido } from "./ProductoMasVendido";
import { useAppContext } from "../../../contexto/Context";

export function PanelVentas({
  filtro,
  ventasFiltradas,
  fechaSeleccionada,
  mesSeleccionado,
}) {
    const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  // Normalizamos ventas (día → array | semana/mes → object)
  let ventasProcesadas = [];
  if (Array.isArray(ventasFiltradas)) {
    ventasProcesadas = ventasFiltradas;
  } else if (typeof ventasFiltradas === "object" && ventasFiltradas !== null) {
    ventasProcesadas = Object.values(ventasFiltradas).flat();
  }

  // Total de ventas
  const totalVentas = ventasProcesadas.reduce((acc, venta) => {
    const suma = venta.user_sales_detail.reduce((sum, p) => {
      const subtotal = parseFloat(p.precio_unitario) * p.cantidad;
      return sum + subtotal;
    }, 0);
    return acc + suma;
  }, 0);

  // Cantidad de ventas
  const cantidadVentas = ventasProcesadas.length;

  // Promedio
  const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

  // Productos vendidos
  const contadorProductos = ventasProcesadas.reduce((acc, venta) => {
    venta.user_sales_detail.forEach((p) => {
      const nombre = p.nombre_producto;
      acc[nombre] = (acc[nombre] || 0) + p.cantidad;
    });
    return acc;
  }, {});

  const productoMenosVendido =
    Object.keys(contadorProductos).reduce((min, prod) => {
      return contadorProductos[prod] < contadorProductos[min] ? prod : min;
    }, Object.keys(contadorProductos)[0] || "") || "N/A";

  // Ranking Top 5
  const rankingTop5 = Object.entries(contadorProductos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Última venta
  const ventaMasReciente =
    ventasProcesadas.length > 0
      ? ventasProcesadas.reduce((latest, venta) =>
          new Date(venta.fecha) > new Date(latest.fecha) ? venta : latest
        )
      : null;

  // Ganancias estimadas
  const gananciasEstimadas = ventasProcesadas.reduce((total, venta) => {
    return (
      total +
      venta.user_sales_detail.reduce((ganancia, p) => {
        const precioVenta = parseFloat(p.precio_unitario);
        const precioCompra = parseFloat(p.precio_compra);
        return ganancia + (precioVenta - precioCompra) * p.cantidad;
      }, 0)
    );
  }, 0);

  // Función para formatear números con puntos
  const formatNumber = (num) =>
    num.toFixed(2).replace(/\.00$/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Clases condicionales por tema
  const bgPanel = dark ? "bg-gray-800 text-gray-200" : "bg-gray-50 text-gray-900";
  const bgCard = (colorClass) => `${dark ? "bg-gray-700" : colorClass}`;

  return (
    <div
      className={`panel-ventas w-[35%] sm:w-[35%] md:w-[29%]  lg:w-[25%] fixed right-0 top-[4.1em] h-[calc(100vh-4.1em)] rounded-l-lg p-3 pb-6 overflow-y-auto shadow-xl transition-colors duration-300 ${bgPanel}`}
    >
      {/* Filtro encabezado */}
      <h3 className="text-center md:text-lg text-xl mb-4 font-bold">
        {filtro === "dia" && `📅 Día detallado: ${fechaSeleccionada}`}
        {filtro === "semana" &&
          (() => {
            const hoy = new Date();
            const primerDia = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
            const ultimoDia = new Date(
              hoy.setDate(hoy.getDate() - hoy.getDay() + 6)
            );
            return `🗓️ Semana detallada: ${primerDia.toLocaleDateString()} - ${ultimoDia.toLocaleDateString()}`;
          })()}
        {filtro === "mes" && `🗓️ Mes detallado: ${mesSeleccionado}`}
      </h3>

      <div className="flex flex-col gap-4">
        {/* Total de Ventas */}
        <div className="flex gap-4">
          <div
            className={`border-l-8 p-4 rounded-xl shadow-lg text-center flex flex-col items-center gap-1 ${dark ? "bg-blue-700 border-blue-500 text-blue-200" : "bg-blue-100 border-blue-600 text-blue-800"}`}
          >
            <p className="text-lg font-semibold uppercase tracking-wide">
              Total de Ventas
            </p>
            <p className="text-2xl font-extrabold">${formatNumber(totalVentas)}</p>
          </div>

          <div
            className={`border-l-8 p-4 rounded-xl shadow-lg text-center flex flex-col items-center gap-1 ${dark ? "bg-green-700 border-green-500 text-green-200" : "bg-green-100 border-green-600 text-green-800"}`}
          >
            <p className="text-lg font-semibold uppercase tracking-wide">
              Cantidad de Ventas
            </p>
            <p className="text-2xl font-extrabold">{cantidadVentas}</p>
          </div>
        </div>

        {/* Ganancias */}
        <div
          className={`border-l-8 p-6 rounded-xl shadow-xl text-center flex flex-col items-center gap-2 ${dark ? "bg-green-700 border-green-500 text-green-200" : "bg-green-100 border-green-600 text-green-800"}`}
        >
          <p className="text-xl font-semibold uppercase tracking-wide">Ganancias Estimadas</p>
          <p className="text-3xl font-extrabold">${formatNumber(gananciasEstimadas)}</p>
        </div>

        {/* Producto más vendido */}
        {/* <ProductoMasVendido ventas={ventasProcesadas} dark={dark} /> */}

        {/* Ranking Top 5 */}
        {rankingTop5.length > 0 && (
          <div
            className={`border-l-8 p-4 rounded-xl shadow-xl text-center ${dark ? "bg-purple-700 border-purple-500 text-purple-200" : "bg-purple-100 border-purple-600 text-purple-800"}`}
          >
            <p className="text-lg font-semibold mb-2 uppercase tracking-wide">
              🏆 Top 5 Productos Más Vendidos
            </p>
            <ul>
              {rankingTop5.map(([nombre, cantidad], index) => (
                <li key={nombre} className="flex justify-between py-1">
                  <span>{index + 1}. {nombre}</span>
                  <span className="font-semibold">{cantidad}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Menos vendido */}
        {productoMenosVendido && (
          <div
            className={`border-l-8 p-4 rounded-xl shadow-xl text-center ${dark ? "bg-red-700 border-red-500 text-red-200" : "bg-red-100 border-red-600 text-red-800"}`}
          >
            <p className="text-lg font-semibold uppercase tracking-wide">📉 Menos Vendido</p>
            <p className="text-xl font-bold">{productoMenosVendido}</p>
          </div>
        )}

        {/* Última venta */}
        {ventaMasReciente && (
          <div
            className={`border-l-8 p-4 rounded-xl shadow-xl text-center ${dark ? "bg-gray-700 border-gray-500 text-gray-200" : "bg-gray-100 border-gray-600 text-gray-700"}`}
          >
            <p className="text-lg font-semibold uppercase tracking-wide">Última Venta</p>
            <p className="text-xl font-bold">
             {new Date(ventaMasReciente.fecha).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
