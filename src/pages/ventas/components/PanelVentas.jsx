import React, { useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import {
  calcularResumenVentas,
  rankingPorCantidad,
  rankingPorGanancia,
  agruparProductosVendidos,
} from "../functions";

export function PanelVentas({
  filtro,
  ventasFiltradas,
  fechaSeleccionada,
  mesSeleccionado,
  rangoFechas,
}) {
  const { preferencias, products } = useAppContext();
  const dark = preferencias?.theme === "dark";

  // Normalizar a lista plana (puede llegar agrupada por día/semana)
  const ventasProcesadas = useMemo(() => {
    if (Array.isArray(ventasFiltradas)) return ventasFiltradas;
    if (typeof ventasFiltradas === "object" && ventasFiltradas !== null) {
      return Object.values(ventasFiltradas).flat();
    }
    return [];
  }, [ventasFiltradas]);

  const resumen = useMemo(
    () => calcularResumenVentas(ventasProcesadas),
    [ventasProcesadas]
  );

  const topUnidades = useMemo(
    () => rankingPorCantidad(ventasProcesadas, 5),
    [ventasProcesadas]
  );

  const topRentables = useMemo(
    () => rankingPorGanancia(ventasProcesadas, 5),
    [ventasProcesadas]
  );

  const contadorProductos = useMemo(
    () => agruparProductosVendidos(ventasProcesadas),
    [ventasProcesadas]
  );

  // Desglose por método de pago
  const desglosePagos = useMemo(() => {
    const mapa = {};
    ventasProcesadas.forEach((v) => {
      const metodo = v.metodo_pago || "efectivo";
      const monto = (v.user_sales_detail || []).reduce(
        (acc, d) => acc + Number(d.precio_unitario || 0) * Number(d.cantidad || 0),
        0
      );
      mapa[metodo] = (mapa[metodo] || 0) + monto;
      mapa[`${metodo}_count`] = (mapa[`${metodo}_count`] || 0) + 1;
    });
    return Object.entries(mapa)
      .filter(([k]) => !k.includes("_count"))
      .map(([metodo, monto]) => ({
        metodo,
        monto,
        cantidad: mapa[`${metodo}_count`] || 0,
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [ventasProcesadas]);

  // Stock por product_id desde products del contexto
  const stockDisponible = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      map[p.id] = Number(p.stock) || 0;
    });
    return map;
  }, [products]);

  // Menor rotación: productos vendidos pocas veces con stock disponible actual
  const menorRotacion = useMemo(() => {
    const conStock = contadorProductos
      .map((p) => ({
        ...p,
        stock: p.stock ?? stockDisponible[p.product_id],
      }))
      .filter((p) => p.stock == null || p.stock > 0);

    return [...conStock]
      .sort((a, b) => a.cantidad - b.cantidad || a.ganancia - b.ganancia)
      .slice(0, 5);
  }, [contadorProductos, stockDisponible]);

  const formatNumber = (num) =>
    num.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "";
    return new Date(fechaStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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
      if (ventasProcesadas.length > 0) {
        const fechas = ventasProcesadas.map((v) => new Date(v.fecha));
        const minFecha = new Date(Math.min(...fechas));
        const maxFecha = new Date(Math.max(...fechas));
        return `${formatearFecha(minFecha)} - ${formatearFecha(maxFecha)}`;
      }
      const hoy = new Date();
      const primerDia = new Date(hoy);
      primerDia.setDate(hoy.getDate() - hoy.getDay());
      const ultimoDia = new Date(primerDia);
      ultimoDia.setDate(primerDia.getDate() + 6);
      return `${formatearFecha(primerDia)} - ${formatearFecha(ultimoDia)}`;
    }
    if (filtro === "mes") {
      const [year, month] = mesSeleccionado.split("-");
      return new Date(year, month - 1).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
      });
    }
    if (filtro === "personalizado" && rangoFechas) {
      return `${formatearFecha(rangoFechas.desde)} - ${formatearFecha(rangoFechas.hasta)}`;
    }
    return "";
  };

  const esEColor = dark ? "text-gray-300" : "text-gray-700";
  const bordeCard = dark ? "border-gray-700" : "border-gray-200";
  const paginaFondo =
    dark ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900";

  const kpiCard = (pos) => {
    const map = {
      total: dark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700",
      ventas: dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700",
      promedio: dark ? "bg-purple-500/15 text-purple-300" : "bg-purple-50 text-purple-700",
      margen: dark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700",
    };
    return map[pos] || (dark ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-gray-700");
  };

  const titulo = (txt) => (
    <h3
      className={`text-sm font-bold uppercase tracking-wider mb-3 ${
        dark ? "text-gray-100" : "text-black"
      }`}
    >
      {txt}
    </h3>
  );

  return (
    <div className={`p-4 ${paginaFondo} print-panel`}>
      {/* ENCABEZADO */}
      <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
        <h1 className={`text-2xl font-bold mb-1 ${dark ? "text-white" : "text-black"}`}>Reporte de Ventas</h1>
        <p className={`text-lg capitalize font-medium ${dark ? "text-blue-400" : "text-blue-700"}`}>
          {obtenerFechaTitulo()}
        </p>
        <p className={`text-sm mt-1 ${esEColor}`}>
          {ventasProcesadas.length} venta{ventasProcesadas.length !== 1 ? "s" : ""} ·{" "}
          {resumen.unidadesVendidas} unidades
        </p>
        <p className={`text-xs mt-2 ${esEColor}`}>
          Generado: {new Date().toLocaleString("es-AR")}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-6 avoid-break">
        <div className={`p-4 rounded-xl border ${bordeCard} ${kpiCard("total")}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${esEColor}`}>
            Total de Ventas
          </p>
          <p className="text-3xl font-bold">${formatNumber(resumen.montoTotal)}</p>
        </div>
        <div className={`p-4 rounded-xl border ${bordeCard} ${kpiCard("margen")}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${esEColor}`}>
            Margen %
          </p>
          <p className="text-3xl font-bold">
            {resumen.margenPorcentual.toFixed(1)}%
          </p>
        </div>
        <div className={`p-4 rounded-xl border ${bordeCard} ${kpiCard("ventas")}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${esEColor}`}>
            Tickets
          </p>
          <p className="text-2xl font-bold">{resumen.totalVentas}</p>
          <p className={`text-xs mt-1 ${esEColor}`}>{resumen.unidadesVendidas} unidades</p>
        </div>
        <div className={`p-4 rounded-xl border ${bordeCard} ${kpiCard("promedio")}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${esEColor}`}>
            Ticket promedio
          </p>
          <p className="text-2xl font-bold">${formatNumber(resumen.ticketPromedio)}</p>
        </div>
      </div>

      {/* GANANCIAS */}
      <div className={`p-4 rounded-xl mb-6 border avoid-break ${dark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
        <p className={`text-sm font-semibold uppercase tracking-wider ${esEColor}`}>
          Ganancias Estimadas
        </p>
        <p className={`text-2xl font-bold ${dark ? "text-amber-300" : "text-amber-700"}`}>
          ${formatNumber(resumen.ganancias)}
        </p>
        <p className={`text-xs mt-1 ${esEColor}`}>
          Margen promedio de {resumen.margenPorcentual.toFixed(1)}% sobre ventas
        </p>
      </div>

      {/* TOP RENTABLES */}
      {topRentables.length > 0 && (
        <div className="mb-6 avoid-break">
          {titulo("Productos más rentables")}
          <div className="space-y-2">
            {topRentables.map((p, index) => (
              <div
                key={p.key}
                className={`flex items-center justify-between p-2 rounded-lg border ${bordeCard} ${
                  dark ? "bg-gray-800/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0 ? "bg-amber-500 text-black" :
                    index === 1 ? "bg-gray-400 text-black" :
                    index === 2 ? "bg-orange-600 text-white" :
                    dark ? "bg-gray-600 text-gray-200" : "bg-gray-300 text-gray-700"
                  }`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm truncate max-w-[140px]">{p.nombre}</p>
                    <p className={`text-xs ${esEColor}`}>
                      {p.cantidad} ud · {p.margenUnitario >= 0 ? "+" : ""}${formatNumber(p.margenUnitario)} c/u
                    </p>
                  </div>
                </div>
                <span className={`font-bold shrink-0 ${
                  p.ganancia >= 0
                    ? dark ? "text-emerald-400" : "text-emerald-700"
                    : dark ? "text-red-400" : "text-red-600"
                }`}>
                  ${formatNumber(p.ganancia)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP UNIDADES */}
      {topUnidades.length > 0 && (
        <div className="mb-6 avoid-break">
          {titulo("Productos más vendidos")}
          <div className="space-y-2">
            {topUnidades.map((p, index) => (
              <div
                key={p.key}
                className={`flex items-center justify-between p-2 rounded-lg border ${bordeCard} ${
                  dark ? "bg-gray-800/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0 ? "bg-amber-500 text-black" :
                    index === 1 ? "bg-gray-400 text-black" :
                    index === 2 ? "bg-orange-600 text-white" :
                    dark ? "bg-gray-600 text-gray-200" : "bg-gray-300 text-gray-700"
                  }`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm truncate max-w-[140px]">{p.nombre}</p>
                    <p className={`text-xs ${esEColor}`}>${formatNumber(p.monto)}</p>
                  </div>
                </div>
                <span className="font-bold shrink-0">{p.cantidad} ud</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DESGLOSE POR MÉTODO DE PAGO */}
      {desglosePagos.length > 0 && (
        <div className="mb-6 avoid-break page-break">
          {titulo("Método de pago")}
          <div className={`p-3 rounded-lg border ${bordeCard} ${dark ? "bg-gray-800/50" : "bg-gray-50"} space-y-2`}>
            {desglosePagos.map((item) => {
              const pct =
                resumen.montoTotal > 0
                  ? (item.monto / resumen.montoTotal) * 100
                  : 0;
              return (
                <div key={item.metodo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">
                      {item.metodo === "transferencia" ? "Transferencia" : item.metodo}
                      <span className={`text-xs ${esEColor}`}> · {item.cantidad} ventas</span>
                    </span>
                    <span className="font-bold">${formatNumber(item.monto)} <span className={`text-xs font-normal ${esEColor}`}>({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MENOR ROTACIÓN */}
      {menorRotacion.length > 0 && (
        <div className="mb-6 avoid-break">
          {titulo("Menor rotación")}
          <div className={`p-3 rounded-lg border ${bordeCard} ${dark ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-200"}`}>
            <p className={`text-xs mb-2 ${esEColor}`}>
              Productos que se vendieron poco y aún tienen stock disponible. Candidatos a promoción.
            </p>
            <div className="space-y-1.5">
              {menorRotacion.map((p, i) => (
                <div key={p.key} className="flex justify-between text-sm">
                  <span className="truncate min-w-0 mr-2">
                    {i + 1}. {p.nombre}
                    {p.talle && <span className={`text-xs ${esEColor}`}> · {p.talle}</span>}
                  </span>
                  <span className="shrink-0 font-medium">
                    {p.cantidad} ud · stock {p.stock ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-center">
        <p className={`text-xs ${esEColor}`}>Sistema de Gestión Comercial</p>
      </div>
    </div>
  );
}
