import React, { useMemo, useState } from "react";
import { useAppContext } from "../../contexto/Context";
import { ListVentas } from "./components/ListVentas";

export function Ventas() {
  const { ventas, loadingVentas, preferencias, products } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const [ventaExpandida, setVentaExpandida] = useState(null);

  const metricas = useMemo(() => {
    const hoy = new Date().toDateString();
    const ventasHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy);

    const totalVentas = ventasHoy.length;
    const montoTotal = ventasHoy.reduce((acc, v) => acc + (v.monto_total || 0), 0);

    let ganancias = 0;
    ventasHoy.forEach(venta => {
      if (venta.user_sales_detail) {
        venta.user_sales_detail.forEach(detail => {
          const diferencia = (detail.precio_unitario || 0) - (detail.precio_compra || 0);
          ganancias += diferencia * (detail.cantidad || 1);
        });
      }
    });

    const ticketPromedio = totalVentas > 0 ? montoTotal / totalVentas : 0;

    const stockBajo = products
      .filter(p => p.stock <= 5 && p.stock > 0)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    const sinStock = products.filter(p => p.stock <= 0).length;

    return { totalVentas, montoTotal, ganancias, ticketPromedio, stockBajo, sinStock };
  }, [ventas, products]);

  const formatoMoneda = (num) => {
    return num.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        dark ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-900"
      } px-3 py-4 md:p-6`}
    >
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`font-bold text-xl md:text-3xl ${
            dark ? "text-blue-400" : "text-blue-600"
          }`}
        >
          📊 Dashboard
        </h1>
        <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-blue-500/30"
              : "bg-white border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🧾</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Tickets hoy
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
            {metricas.totalVentas}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-green-500/30"
              : "bg-white border-green-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Total ventas
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
            ${formatoMoneda(metricas.montoTotal)}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-yellow-500/30"
              : "bg-white border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📈</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Ganancias
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-yellow-400" : "text-yellow-700"}`}>
            ${formatoMoneda(metricas.ganancias)}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border-2 ${
            dark
              ? "bg-gray-800 border-purple-500/30"
              : "bg-white border-purple-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Ticket promedio
            </span>
          </div>
          <span className={`text-2xl font-bold ${dark ? "text-purple-400" : "text-purple-700"}`}>
            ${formatoMoneda(metricas.ticketPromedio)}
          </span>
        </div>
      </div>

      {/* ALERTAS Y ÚLTIMAS VENTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* STOCK BAJO */}
        <div
          className={`p-4 rounded-xl border ${
            dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>
              ⚠️ Stock bajo
            </h2>
            {metricas.sinStock > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {metricas.sinStock} sin stock
              </span>
            )}
          </div>
          {metricas.stockBajo.length > 0 ? (
            <ul className="space-y-2">
              {metricas.stockBajo.map((prod) => (
                <li
                  key={prod.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    dark ? "bg-gray-700/50" : "bg-gray-50"
                  }`}
                >
                  <span className={`text-sm truncate flex-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    {prod.products_base?.name || prod.user_custom_products?.name}
                  </span>
                  <span
                    className={`text-sm font-bold ml-2 ${
                      prod.stock <= 0
                        ? "text-red-500"
                        : "text-orange-500"
                    }`}
                  >
                    {prod.stock <= 0 ? "Sin stock" : `${prod.stock} ud`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
              ✅ Todo el stock estáOK
            </p>
          )}
        </div>

          {/* ÚLTIMAS VENTAS */}
        <div
          className={`p-4 rounded-xl border ${
            dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h2 className={`font-bold mb-3 ${dark ? "text-gray-200" : "text-gray-800"}`}>
            🕐 Últimas ventas
          </h2>
          {ventas.length > 0 ? (
            <ul className="space-y-2">
              {ventas.slice(0, 5).map((venta) => {
                const detalles = venta.user_sales_detail || [];
                const cantidadProductos = detalles.reduce((acc, d) => acc + (d.cantidad || 1), 0);
                const estaExpandida = ventaExpandida === venta.id;

                return (
                  <li key={venta.id}>
                    <div
                      onClick={() => setVentaExpandida(estaExpandida ? null : venta.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        dark ? "bg-gray-700/50 hover:bg-gray-600/50" : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`transform transition-transform ${estaExpandida ? "rotate-90" : ""}`}>
                          ▶
                        </span>
                        <div>
                          <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                            {new Date(venta.fecha).toLocaleString("es-AR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className={`text-xs block ${dark ? "text-gray-500" : "text-gray-400"}`}>
                            {cantidadProductos} {cantidadProductos === 1 ? "producto" : "productos"}
                          </span>
                        </div>
                      </div>
                      <span className={`font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                        ${formatoMoneda(venta.monto_total)}
                      </span>
                    </div>

                    {estaExpandida && detalles.length > 0 && (
                      <ul className={`mt-2 ml-6 space-y-1 p-2 rounded-lg ${dark ? "bg-gray-900/50" : "bg-white"}`}>
                        {detalles.map((detalle, idx) => (
                          <li key={idx} className={`flex justify-between text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
                            <span className="truncate flex-1 mr-2">
                              {detalle.nombre_producto}
                            </span>
                            <span className="shrink-0">
                              x{detalle.cantidad} · ${formatoMoneda(detalle.precio_unitario * detalle.cantidad)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
              No hay ventas registradas
            </p>
          )}
        </div>
      </div>

      {/* HISTORIAL COMPLETO */}
      <h2
        className={`font-bold mb-4 ${dark ? "text-gray-200" : "text-gray-800"}`}
      >
        📋 Historial de Ventas
      </h2>
      <div className="flex w-full">
        {loadingVentas ? (
          <div className={`${dark ? "text-gray-200" : "text-gray-700"} p-4`}>
            Cargando ventas...
          </div>
        ) : (
          <ListVentas ventas={ventas} dark={dark} />
        )}
      </div>
    </div>
  );
}
