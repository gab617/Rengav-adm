import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useVentas } from "../../../../hooks/useVentas";
import { useAppContext } from "../../../../contexto/Context";
dayjs.locale("es");

export function ConsolaAdmin() {
  const {
    eliminarPorDia,
    eliminarPorMes,
    eliminarTodo,
    fechaSeleccionada,
    setFechaSeleccionada,
    mesSeleccionado,
    setMesSeleccionado,
    loadingVentas
  } = useAppContext();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [accionFecha, setAccionFecha] = useState(null); // "dia" o "mes"
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const actions = [
    { key: "dia", label: "Eliminar por día" },
    { key: "mes", label: "Eliminar por mes" },
    { key: "todos", label: "Borrar todos los datos" },
  ];

  // Cierra la consola al clickear fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setConfirmAction(null);
        setAccionFecha(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExecuteAction = async (key) => {
    try {
      if (key === "dia") await eliminarPorDia(fechaSeleccionada);
      if (key === "mes") await eliminarPorMes(mesSeleccionado);
      if (key === "semana") {
        const hoy = dayjs();
        const semana = { inicio: hoy.startOf("week").format("YYYY-MM-DD"), fin: hoy.endOf("week").format("YYYY-MM-DD") };
        await eliminarPorDia(semana); // Adaptar según tu endpoint de semana si es diferente
      }
      if (key === "todos") await eliminarTodo();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmAction(null);
      setAccionFecha(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Botón flotante */}
      <button
        ref={buttonRef}
        className={`fixed top-[1em] left-4 px-4 py-2 rounded-full shadow-lg z-50 transition-colors ${
          isOpen ? "bg-green-600 text-white" : "bg-gray-800 text-white hover:bg-gray-900"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        Consola Admin
      </button>

      {/* Panel lateral */}
      <div
        ref={panelRef}
        className={`fixed top-[3em] left-[1em] bg-white shadow-2xl rounded-lg p-4 flex flex-col gap-4 transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-20 opacity-0"
        }`}
      >
        {actions.map((action) => (
          <div key={action.key} className="relative flex flex-col items-center">
            <button
              className={`px-4 py-2 rounded-md text-white font-medium whitespace-nowrap transition-colors ${
                action.key === "todos"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={() => {
                if (action.key === "dia" || action.key === "mes") setAccionFecha(action.key);
                setConfirmAction(confirmAction === action.key ? null : action.key);
              }}
            >
              {confirmAction === action.key ? "¿Confirmar?" : action.label}
            </button>

            {/* Selector de fecha/mes si corresponde */}
            {confirmAction === action.key && accionFecha && (
              <div className="mt-2">
                {accionFecha === "dia" && (
                  <input
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                    className="border p-1 rounded text-sm"
                  />
                )}
                {accionFecha === "mes" && (
                  <input
                    type="month"
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(e.target.value)}
                    className="border p-1 rounded text-sm"
                  />
                )}
              </div>
            )}

            {/* Botones de confirmación */}
            {confirmAction === action.key && (
              <div className="mt-2 flex gap-2 bg-gray-50 p-2 rounded shadow-md">
                <button
                  className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  onClick={() => handleExecuteAction(action.key)}
                >
                  Sí
                </button>
                <button
                  className="px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
                  onClick={() => {
                    setConfirmAction(null);
                    setAccionFecha(null);
                  }}
                >
                  No
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
