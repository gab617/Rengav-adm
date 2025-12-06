import React from "react";
import { useAppContext } from "../../contexto/Context";
import { FormProveedor } from "./FormProveedor";
import { ListProveedores } from "./components/ListProveedores";
import { ListPedido } from "./components/ListPedido";

export function Proveedores() {
  const { proveedores, pedido, eliminarProveedor, loading, error, productos, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const bgMain = dark ? "bg-gray-900 text-gray-200" : "bg-gray-100 text-gray-900";
  const textHeading = dark ? "text-blue-400" : "text-blue-600";
  const textEmpty = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`p-6 min-h-screen transition-colors duration-300 ${bgMain}`}>
      <h2 className={`text-2xl font-bold mb-4 text-center ${textHeading}`}>
        📜 Lista de Proveedores
      </h2>

      <div className="flex flex-col justify-center mb-4">
        <FormProveedor dark={dark} />
      </div>

      {/* Lista de Proveedores */}
      {proveedores.length === 0 ? (
        <p className={`text-center ${textEmpty}`}>
          No hay proveedores registrados.
        </p>
      ) : (
        <ListProveedores proveedores={proveedores} dark={dark} />
      )}
    </div>
  );
}
