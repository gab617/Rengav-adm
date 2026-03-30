import React from "react";
import { useAppContext } from "../../../contexto/Context";

export function PanelVentas({
  filtro,
  ventasFiltradas,
  fechaSeleccionada,
  mesSeleccionado,
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  let ventasProcesadas = [];
  if (Array.isArray(ventasFiltradas)) {
    ventasProcesadas = ventasFiltradas;
  } else if (typeof ventasFiltradas === "object" && ventasFiltradas !== null) {
    ventasProcesadas = Object.values(ventasFiltradas).flat();
  }

  const totalVentas = ventasProcesadas.reduce((acc, venta) => {
    const suma = (venta.user_sales_detail || []).reduce((sum, p) => {
      const subtotal = parseFloat(p.precio_unitario || 0) * p.cantidad;
      return sum + subtotal;
    }, 0);
    return acc + suma;
  }, 0);

  const cantidadVentas = ventasProcesadas.length;
  const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

  const contadorProductos = ventasProcesadas.reduce((acc, venta) => {
    (venta.user_sales_detail || []).forEach((p) => {
      const nombre = p.nombre_producto;
      acc[nombre] = (acc[nombre] || 0) + p.cantidad;
    });
    return acc;
  }, {});

  const rankingTop5 = Object.entries(contadorProductos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const productoMenosVendido =
    Object.keys(contadorProductos).length > 0
      ? Object.entries(contadorProductos).reduce((min, curr) =>
          curr[1] < min[1] ? curr : min
        )[0]
      : null;

  const ventaMasReciente =
    ventasProcesadas.length > 0
      ? ventasProcesadas.reduce((latest, venta) =>
          new Date(venta.fecha) > new Date(latest.fecha) ? venta : latest
        )
      : null;

  const gananciasEstimadas = ventasProcesadas.reduce((total, venta) => {
    return (
      total +
      (venta.user_sales_detail || []).reduce((ganancia, p) => {
        const precioVenta = parseFloat(p.precio_unitario || 0);
        const precioCompra = parseFloat(p.precio_compra || 0);
        return ganancia + (precioVenta - precioCompra) * p.cantidad;
      }, 0)
    );
  }, 0);

  const formatNumber = (num) =>
    num.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const obtenerFechaTitulo = () => {
    if (filtro === "dia") {
      return new Date(fechaSeleccionada).toLocaleDateString("es-AR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    if (filtro === "semana") {
      const hoy = new Date();
      const primerDia = new Date(hoy);
      primerDia.setDate(hoy.getDate() - hoy.getDay());
      const ultimoDia = new Date(primerDia);
      ultimoDia.setDate(primerDia.getDate() + 6);
      return `${primerDia.toLocaleDateString("es-AR")} - ${ultimoDia.toLocaleDateString("es-AR")}`;
    }
    if (filtro === "mes") {
      const [year, month] = mesSeleccionado.split("-");
      return new Date(year, month - 1).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
      });
    }
    return "";
  };

  const esMobile = window.innerWidth < 768;

  return (
    <div className={`p-4 ${bgPanel(dark)} print-panel`}>
      {/* ENCABEZADO */}
      <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
        <h1 className="text-2xl font-bold mb-1">Reporte de Ventas</h1>
        <p className="text-lg capitalize">{obtenerFechaTitulo()}</p>
        <p className="text-sm opacity-70 mt-1">Generado: {new Date().toLocaleString("es-AR")}</p>
      </div>

      {/* RESUMEN PRINCIPAL */}
      <div className="mb-6">
        <div className={`p-4 rounded-xl mb-3 ${dark ? "bg-green-900/50" : "bg-green-100"}`}>
          <p className="text-sm uppercase tracking-wide opacity-80">Total de Ventas</p>
          <p className="text-3xl font-bold text-green-600">${formatNumber(totalVentas)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg ${dark ? "bg-blue-900/50" : "bg-blue-100"}`}>
            <p className="text-xs uppercase tracking-wide opacity-70">Cant. Ventas</p>
            <p className="text-xl font-bold">{cantidadVentas}</p>
          </div>
          <div className={`p-3 rounded-lg ${dark ? "bg-purple-900/50" : "bg-purple-100"}`}>
            <p className="text-xs uppercase tracking-wide opacity-70">Promedio</p>
            <p className="text-xl font-bold">${formatNumber(promedioVenta)}</p>
          </div>
        </div>
      </div>

      {/* GANANCIAS */}
      <div className={`p-4 rounded-xl mb-6 ${dark ? "bg-yellow-900/50" : "bg-yellow-100"}`}>
        <p className="text-sm uppercase tracking-wide opacity-80">Ganancias Estimadas</p>
        <p className="text-2xl font-bold text-yellow-600">${formatNumber(gananciasEstimadas)}</p>
        <p className="text-xs opacity-60 mt-1">Basado en precio de compra</p>
      </div>

      {/* TOP 5 PRODUCTOS */}
      {rankingTop5.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            🏆 Top Productos
          </h3>
          <div className="space-y-2">
            {rankingTop5.map(([nombre, cantidad], index) => (
              <div
                key={nombre}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  dark ? "bg-gray-700/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? "bg-yellow-500 text-black" :
                    index === 1 ? "bg-gray-400 text-black" :
                    index === 2 ? "bg-orange-600 text-white" :
                    dark ? "bg-gray-600" : "bg-gray-300"
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm truncate max-w-[150px]">{nombre}</span>
                </div>
                <span className="font-bold">{cantidad} ud</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ÚLTIMA VENTA */}
      {ventaMasReciente && (
        <div className={`p-3 rounded-lg mb-3 ${dark ? "bg-gray-700/50" : "bg-gray-100"}`}>
          <p className="text-xs uppercase tracking-wide opacity-60">Última Venta</p>
          <p className="font-medium">
            {new Date(ventaMasReciente.fecha).toLocaleString("es-AR")}
          </p>
          <p className="text-sm font-bold text-green-600">
            ${formatNumber(ventaMasReciente.monto_total)}
          </p>
        </div>
      )}

      {/* MENOS VENDIDO */}
      {productoMenosVendido && (
        <div className={`p-3 rounded-lg ${dark ? "bg-red-900/30" : "bg-red-50"}`}>
          <p className="text-xs uppercase tracking-wide opacity-60">Menos Vendido</p>
          <p className="font-medium truncate">{productoMenosVendido}</p>
          <p className="text-sm text-red-500">
            {contadorProductos[productoMenosVendido]} unidades
          </p>
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs opacity-50">Sistema de Gestión Comercial</p>
      </div>
    </div>
  );
}

const bgPanel = (dark) =>
  dark
    ? "bg-gray-800 text-gray-200"
    : "bg-white text-gray-900";
