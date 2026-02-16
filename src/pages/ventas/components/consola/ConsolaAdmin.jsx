import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
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
  } = useAppContext();

  const esMobile = window.innerWidth < 768;

  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [accionFecha, setAccionFecha] = useState(null);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const actions = [
    { key: "dia", label: "Eliminar por día" },
    { key: "mes", label: "Eliminar por mes" },
    { key: "todos", label: "Borrar todos los datos" },
  ];

  useEffect(() => {
    if (esMobile) return; // en mobile se cierra con overlay
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
  }, [esMobile]);

  const handleExecuteAction = async (key) => {
    try {
      if (key === "dia") await eliminarPorDia(fechaSeleccionada);
      if (key === "mes") await eliminarPorMes(mesSeleccionado);
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
    <>
      {/* Botón */}
      <button
        ref={buttonRef}
        className="
    fixed z-20 px-4 py-2 rounded-full shadow-lg bg-blue-600 text-white

    top-4 left-4

    max-md:left-1/2
    max-md:-translate-x-1/2
  "
        onClick={() => setIsOpen(true)}
      >
        Consola Admin
      </button>

      {/* Overlay mobile */}
      {isOpen && esMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={`
            fixed z-50 bg-white shadow-2xl rounded-lg p-4 flex flex-col gap-4
            transition-all duration-300

            ${
              esMobile
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm"
                : "top-[3em] left-[1em] w-64"
            }
          `}
        >
          <h3 className="text-center text-black font-bold text-lg">
            Consola de administración
          </h3>

          {actions.map((action) => (
            <div
              key={action.key}
              className="relative flex flex-col items-center"
            >
              <button
                className={`w-full px-4 py-2 rounded-md text-black font-medium ${
                  action.key === "todos" ? "bg-red-600" : "bg-blue-600"
                }`}
                onClick={() => {
                  if (action.key === "dia" || action.key === "mes")
                    setAccionFecha(action.key);
                  setConfirmAction(
                    confirmAction === action.key ? null : action.key,
                  );
                }}
              >
                {confirmAction === action.key ? "¿Confirmar?" : action.label}
              </button>

              {confirmAction === action.key && accionFecha && (
                <div className="mt-2 text-black">
                  {accionFecha === "dia" && (
                    <input
                      type="date"
                      value={fechaSeleccionada}
                      onChange={(e) => setFechaSeleccionada(e.target.value)}
                      className="border p-1 rounded"
                    />
                  )}
                  {accionFecha === "mes" && (
                    <input
                      type="month"
                      value={mesSeleccionado}
                      onChange={(e) => setMesSeleccionado(e.target.value)}
                      className="border p-1 rounded"
                    />
                  )}
                </div>
              )}

              {confirmAction === action.key && (
                <div className="mt-2 flex gap-2">
                  <button
                    className="px-3 py-1 bg-green-600 text-white rounded"
                    onClick={() => handleExecuteAction(action.key)}
                  >
                    Sí
                  </button>
                  <button
                    className="px-3 py-1 bg-red-600 rounded"
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

          {esMobile && (
            <button
              onClick={() => setIsOpen(false)}
              className="mt-2 text-sm text-black "
            >
              Cerrar
            </button>
          )}
        </div>
      )}
    </>
  );
}
