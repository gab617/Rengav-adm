import React from "react";
import { useAppContext } from "../../contexto/Context";
import { ListVentas } from "./components/ListVentas";

export function Ventas() {
  const { ventas, loadingVentas, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const esMobile = window.innerWidth < 768;

  return (
    <div
      className={`
        min-h-screen transition-colors duration-300
        ${dark ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-900"}
        px-3 py-4 md:p-6
      `}
    >
      <h1
        className={`
          font-bold mb-4
          ${dark ? "text-blue-400" : "text-blue-600"}
          text-xl md:text-3xl
        `}
      >
        📊 Historial de Ventas
      </h1>

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
