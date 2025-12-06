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
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const panelRef = useRef();
  const [ventaActiva, setVentaActiva] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [filtro, setFiltro] = useState("dia");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [mesSeleccionado, setMesSeleccionado] = useState(
    dayjs().format("YYYY-MM")
  );

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
    const hoy = dayjs();
    let filtradas = ventas.filter((venta) => {
      const fechaVenta = dayjs(venta.fecha);
      if (filtro === "dia") return fechaVenta.isSame(fechaSeleccionada, "day");
      if (filtro === "mes") return fechaVenta.isSame(mesSeleccionado, "month");
      if (filtro === "semana")
        return fechaVenta.isBetween(
          hoy.startOf("week"),
          hoy.endOf("week"),
          null,
          "[]"
        );
      return true;
    });

    if (filtro === "semana") return groupByDay(filtradas);
    if (filtro === "mes") return groupByWeek(filtradas);
    return filtradas;
  }, [ventas, filtro, fechaSeleccionada, mesSeleccionado]);

  const handlePrintPanel = useReactToPrint({ contentRef: panelRef });

  useEffect(() => {
    setVentaActiva(null);
    setMostrarDetalles(false);
  }, [ventas]);

  if (loadingVentas) {
    return (
      <div
        className={`flex justify-center items-center h-64 ${
          dark ? "text-gray-200" : "text-gray-600"
        }`}
      >
        <p className="text-lg font-semibold">Cargando ventas...</p>
      </div>
    );
  }

  return (
    <div
      className={`${
        dark ? "text-gray-200" : "text-gray-900"
      } transition-colors duration-300`}
    >
      <div className="mb-4">
        <label className="mr-2 font-semibold">Filtrar por:</label>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className={`border p-2 rounded-lg ${
            dark
              ? "bg-gray-800 text-gray-200 border-gray-600"
              : "bg-white text-gray-900"
          }`}
        >
          <option value="dia">Día</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
      </div>

      {filtro === "dia" && (
        <div className="mb-4">
          <label htmlFor="fecha" className="mr-2 font-semibold">
            Selecciona un día:
          </label>
          <input
            id="fecha"
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className={`border p-2 rounded-lg ${
              dark
                ? "bg-gray-800 text-gray-200 border-gray-600"
                : "bg-white text-gray-900"
            }`}
          />
        </div>
      )}

      {filtro === "mes" && (
        <div className="mb-4">
          <label htmlFor="mes" className="mr-2 font-semibold">
            Selecciona un mes:
          </label>
          <input
            id="mes"
            type="month"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className={`border p-2 rounded-lg ${
              dark
                ? "bg-gray-800 text-gray-200 border-gray-600"
                : "bg-white text-gray-900"
            }`}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <button
          onClick={toggleMostrarDetalles}
          className={`px-5 py-2 font-semibold rounded-lg shadow transition-colors duration-200 ${
            dark
              ? "bg-blue-700 hover:bg-blue-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {mostrarDetalles
            ? "🔽 Ocultar todos los detalles"
            : "🔼 Mostrar todos los detalles"}
        </button>
        <button
          onClick={handlePrintPanel}
          className={`px-5 py-2 font-semibold rounded-lg shadow transition-colors duration-200 ${
            dark
              ? "bg-teal-700 hover:bg-teal-600 text-white"
              : "bg-teal-600 hover:bg-teal-700 text-white"
          }`}
        >
          CREAR PDF / IMPRIMIR INFORME
        </button>
      </div>

      <ConsolaAdmin
        eliminarPorDia={eliminarPorDia}
        eliminarPorMes={eliminarPorMes}
        eliminarTodo={eliminarTodo}
        fetchVentas={fetchVentas}
      />

      <div className="flex">
        <div className="w-[80%]">
          {Object.keys(ventasFiltradas).length === 0 ? (
            <p
              className={`text-center ${
                dark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              No hay ventas registradas.
            </p>
          ) : (
            <div className="text-lg">
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
                    <h3 className="font-semibold text-lg">{`Semana ${semana}`}</h3>
                    <ul className="w-[80%] lg:w-[88%] grid grid-cols-2 md:grid-cols-4 sm:grid-cols-3 lg:grid-cols-7 xl:grid-cols-8 gap-1">
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

        <div className="ml-4" ref={panelRef}>
          <PanelVentas
            filtro={filtro}
            ventas={ventas}
            ventasFiltradas={ventasFiltradas}
            fechaSeleccionada={fechaSeleccionada}
            mesSeleccionado={mesSeleccionado}
          />
        </div>
      </div>
    </div>
  );
}
