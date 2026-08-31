import React, { useState, useRef, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import "dayjs/locale/es";
import { useReactToPrint } from "react-to-print";
import "./print.css";

import { LiVenta } from "./LiVenta";
import { PanelVentas } from "./PanelVentas";
import { FiltroPorDia } from "./plazosDeVentas/FiltroPorDia";
import { FiltroPorSemana } from "./plazosDeVentas/FiltroPorSemana";
import { ConsolaAdmin } from "./consola/ConsolaAdmin";
import { useAppContext } from "../../../contexto/Context";

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.locale("es");

export function ListVentas({
  ventas,
  fetchVentas,
  eliminarPorDia,
  eliminarPorMes,
  eliminarTodo,
  eliminarVenta,
  loadingVentas,
  filtro,
  fechaSeleccionada,
  mesSeleccionado,
  rangoFechas,
  cambiarFiltroRapido,
  setRangoPersonalizado,
  setFechaSeleccionada,
  setMesSeleccionado,
  busquedaCliente,
  setBusquedaCliente,
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const esMobile = window.innerWidth < 768;

  const panelRef = useRef();
  const [ventaActiva, setVentaActiva] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [openPanel, setOpenPanel] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customDesde, setCustomDesde] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [customHasta, setCustomHasta] = useState(dayjs().format("YYYY-MM-DD"));
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const toggleVenta = (id) => setVentaActiva(ventaActiva === id ? null : id);
  const toggleMostrarDetalles = () => setMostrarDetalles(!mostrarDetalles);

  const groupByDay = (ventas) => {
    const grouped = {};
    ventas.forEach((venta) => {
      const fecha = dayjs(venta.fecha).format("YYYY-MM-DD");
      if (!grouped[fecha]) grouped[fecha] = [];
      grouped[fecha].push(venta);
    });
    return grouped;
  };

  const groupByWeek = (ventas) => {
    const grouped = {};
    ventas.forEach((venta) => {
      const semana = dayjs(venta.fecha).week();
      if (!grouped[semana]) grouped[semana] = [];
      grouped[semana].push(venta);
    });
    return grouped;
  };

  const ventasFiltradas = useMemo(() => {
    const term = (busquedaCliente || "").trim().toLowerCase();
    let base = ventas;

    // 1) Filtrar por búsqueda de cliente
    if (term) {
      base = base.filter((venta) => {
        const nombre = (venta.cliente_nombre || "").toLowerCase();
        const telefono = (venta.cliente_telefono || "").toLowerCase();
        const email = (venta.cliente_email || "").toLowerCase();
        return nombre.includes(term) || telefono.includes(term) || email.includes(term);
      });
    }

    // 2) Filtrar por estado (confirmado / pendiente / todos)
    if (filtroEstado === "confirmado") {
      base = base.filter((v) => !v.estado || v.estado === "confirmado");
    } else if (filtroEstado === "pendiente") {
      base = base.filter((v) => v.estado === "pendiente");
    }

    // 3) Agrupar según modo
    if (filtro === "semana") return groupByDay(base);
    if (filtro === "mes") return groupByWeek(base);
    return base;
  }, [ventas, filtro, busquedaCliente, filtroEstado]);

  const handlePrintPanel = useReactToPrint({ contentRef: panelRef });

  const handleCustomRange = () => {
    setRangoPersonalizado(customDesde, customHasta);
    setShowCustomRange(false);
  };

  useEffect(() => {
    setVentaActiva(null);
    setMostrarDetalles(false);
  }, [ventas]);

  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  const botonesFiltro = [
    { id: "hoy", label: "Hoy", filtro: "dia" },
    { id: "semana", label: "Semana", filtro: "semana" },
    { id: "mes", label: "Mes", filtro: "mes" },
    { id: "personalizado", label: "Personalizado", filtro: "personalizado" },
  ];

  if (loadingVentas) {
    return (
      <div className={`flex justify-center items-center h-64 ${textSecondary}`}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-lg font-semibold">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-colors duration-300`}>
      {/* FILTROS RÁPIDOS */}
      <div className={`p-3 sm:p-4 rounded-2xl ${bgCard} border ${borderColor} mb-4`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs sm:text-sm font-medium ${textSecondary}`}>📅 PERÍODO</span>
          <span className={`text-xs sm:text-sm ${textSecondary}`}>
            {ventas.length} venta{ventas.length !== 1 ? "s" : ""}
          </span>
        </div>
        
        {/* BOTONES DE FILTRO - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {botonesFiltro.map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                if (btn.id === "personalizado") {
                  if (filtro !== "personalizado") {
                    setRangoPersonalizado(customDesde, customHasta);
                  }
                  setShowCustomRange(true);
                } else {
                  cambiarFiltroRapido(btn.id);
                  setShowCustomRange(false);
                }
              }}
              className={`px-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                (filtro === btn.filtro && btn.id !== "personalizado") || 
                (btn.id === "personalizado" && filtro === "personalizado")
                  ? "bg-blue-500 text-white shadow-md"
                  : dark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* SELECTOR ESPECÍFICO SEGÚN FILTRO + RANGO PERSONALIZADO */}
        <div className={`p-3 rounded-xl ${dark ? "bg-gray-700/30" : "bg-gray-50"}`}>
          {filtro === "dia" && (
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className={`text-xs ${textSecondary} sm:shrink-0`}>📌 Día:</span>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className={`flex-1 w-full px-3 py-2 rounded-lg border text-sm ${dark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"}`}
              />
            </div>
          )}
          
          {filtro === "mes" && (
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className={`text-xs ${textSecondary} sm:shrink-0`}>📌 Mes:</span>
              <input
                type="month"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className={`flex-1 w-full px-3 py-2 rounded-lg border text-sm ${dark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"}`}
              />
            </div>
          )}

          {filtro === "semana" && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${textSecondary}`}>📌 Mostrando ventas de la semana actual</span>
            </div>
          )}

          {filtro === "personalizado" && (
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                <label className={`block text-xs ${textSecondary} mb-1`}>Desde</label>
                <input
                  type="date"
                  value={customDesde}
                  onChange={(e) => setCustomDesde(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"}`}
                />
              </div>
              <div className="flex-1 w-full">
                <label className={`block text-xs ${textSecondary} mb-1`}>Hasta</label>
                <input
                  type="date"
                  value={customHasta}
                  onChange={(e) => setCustomHasta(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"}`}
                />
              </div>
              <button
                onClick={handleCustomRange}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors w-full sm:w-auto"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BÚSQUEDA POR CLIENTE */}
      <div className={`p-3 sm:p-4 rounded-2xl ${bgCard} border ${borderColor} mb-4`}>
        <div className="flex items-center gap-3 mb-3">
          <span className={`text-lg shrink-0`}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email del cliente..."
            value={busquedaCliente || ""}
            onChange={(e) => setBusquedaCliente(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
              dark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500"
            }`}
          />
          {busquedaCliente && (
            <button
              onClick={() => setBusquedaCliente("")}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* FILTROS DE ESTADO */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${textSecondary}`}>Estado:</span>
          {[
            { id: "todos", label: "Todos" },
            { id: "confirmado", label: "✅ Confirmados" },
            { id: "pendiente", label: "⏳ Pendientes" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFiltroEstado(btn.id)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                filtroEstado === btn.id
                  ? "bg-blue-500 text-white shadow-md"
                  : dark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={toggleMostrarDetalles}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            mostrarDetalles
              ? dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
              : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
          }`}
        >
          {mostrarDetalles ? "🔽" : "🔼"} {mostrarDetalles ? "Ocultar" : "Ver"} detalles
        </button>
        {!esMobile && (
          <button
            onClick={handlePrintPanel}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              dark ? "bg-teal-500/20 text-teal-400" : "bg-teal-50 text-teal-600"
            }`}
          >
            🖨️ Imprimir
          </button>
        )}
      </div>

      <ConsolaAdmin
        eliminarPorDia={eliminarPorDia}
        eliminarPorMes={eliminarPorMes}
        eliminarTodo={eliminarTodo}
        fetchVentas={fetchVentas}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          {Object.keys(ventasFiltradas).length === 0 ? (
            <div className={`p-8 text-center rounded-2xl ${bgCard}`}>
              <span className="text-4xl mb-2 block">📭</span>
              <p className={textSecondary}>No hay ventas en este período</p>
            </div>
          ) : (
            <div className="text-sm">
              {filtro === "semana" ? (
                <FiltroPorSemana
                  dark={dark}
                  ventasFiltradas={ventasFiltradas}
                  mostrarDetalles={mostrarDetalles}
                  ventaActiva={ventaActiva}
                  toggleVenta={toggleVenta}
                />
              ) : filtro === "mes" ? (
                Object.keys(ventasFiltradas).map((semana) => (
                  <div key={semana} className="mb-4">
                    <h3 className="font-semibold text-sm mb-2">Semana {semana}</h3>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {ventasFiltradas[semana].map((venta, index) => (
                        <LiVenta
                          key={index}
                          venta={venta}
                          mostrarDetalles={mostrarDetalles}
                          ventaActiva={ventaActiva}
                          index={index}
                          toggleVenta={toggleVenta}
                          eliminarVenta={eliminarVenta}
                        />
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <FiltroPorDia
                  ventasFiltradas={ventasFiltradas}
                  mostrarDetalles={mostrarDetalles}
                  ventaActiva={ventaActiva}
                  toggleVenta={toggleVenta}
                  eliminarVenta={eliminarVenta}
                />
              )}
            </div>
          )}
        </div>
        
        {!esMobile && (
          <div className="lg:w-80 shrink-0" ref={panelRef}>
            <PanelVentas
              filtro={filtro}
              ventas={ventas}
              ventasFiltradas={ventasFiltradas}
              fechaSeleccionada={fechaSeleccionada}
              mesSeleccionado={mesSeleccionado}
              rangoFechas={rangoFechas}
              printRef={panelRef}
            />
          </div>
        )}
      </div>
      
      {/* MOBILE PANEL */}
      {esMobile && (
        <button
          onClick={() => setOpenPanel(true)}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full shadow-xl bg-blue-600 text-white text-xl flex items-center justify-center"
        >
          📊
        </button>
      )}
      {esMobile && openPanel && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end justify-center">
          <div
            className={`w-full max-h-[85vh] overflow-y-auto rounded-t-3xl p-4 ${dark ? "bg-gray-900" : "bg-white"}`}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">Resumen</h2>
              <button onClick={() => setOpenPanel(false)} className="text-2xl">❌</button>
            </div>
            <PanelVentas
              filtro={filtro}
              ventas={ventas}
              ventasFiltradas={ventasFiltradas}
              fechaSeleccionada={fechaSeleccionada}
              mesSeleccionado={mesSeleccionado}
              rangoFechas={rangoFechas}
            />
          </div>
        </div>
      )}
    </div>
  );
}
