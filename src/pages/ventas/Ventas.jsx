import React from "react";
import { useAppContext } from "../../contexto/Context";
import { ListVentas } from "./components/ListVentas";

export function Ventas() {
  const { ventas, loadingVentas, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  return (
    <div
      className={`p-6 min-h-screen transition-colors duration-300 ${
        dark ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-900"
      }`}
    >
      <h1
        className={`text-3xl font-bold mb-4 text-start ${
          dark ? "text-blue-400" : "text-blue-600"
        }`}
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
