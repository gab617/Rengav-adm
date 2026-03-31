import React from "react";
import { useAppContext } from "../../../contexto/Context";

export function Config() {
  const { preferencias, updatePreferencias, cargandoPreferencias } =
    useAppContext();

  if (cargandoPreferencias)
    return (
      <div
        className={`p-4 ${
          preferencias?.theme === "dark" ? "text-gray-300" : "text-gray-500"
        }`}
      >
        Cargando configuración...
      </div>
    );

  const dark = preferencias?.theme === "dark";

  const bgBase = dark ? "bg-gray-900" : "bg-gray-100";
  const textBase = dark ? "text-white" : "text-black";
  const cardBg = dark ? "bg-gray-800" : "bg-white";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  const handleChangeTheme = (tema) => {
    updatePreferencias({ theme: tema });
  };

  return (
    <div className={`flex flex-col gap-4 ${bgBase} ${textBase}`}>
      {/* ===================== SELECCIÓN DE TEMA ===================== */}
      <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
        <h2 className="text-lg font-semibold mb-4 text-center">Tema de la aplicación</h2>

        <div className="flex gap-4 justify-center max-w-md mx-auto">
          {/* Tema Claro */}
          <div
            onClick={() => handleChangeTheme("light")}
            className={`rounded-xl cursor-pointer transition-all border p-3 w-28 md:w-32 flex-shrink-0 ${
              preferencias?.theme === "light"
                ? "border-blue-500 shadow-lg"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <img
              src="./tema-light.png"
              alt="Tema claro"
              className="w-full h-12 md:h-16 object-contain rounded"
            />
            <p className="text-center mt-2 font-medium text-sm">Claro</p>
          </div>

          {/* Tema Oscuro */}
          <div
            onClick={() => handleChangeTheme("dark")}
            className={`rounded-xl cursor-pointer transition-all border p-3 w-28 md:w-32 flex-shrink-0 ${
              preferencias?.theme === "dark"
                ? "border-blue-500 shadow-lg"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <img
              src="./tema-dark.png"
              alt="Tema oscuro"
              className="w-full h-12 md:h-16 object-contain rounded"
            />
            <p className="text-center mt-2 font-medium text-sm">Oscuro</p>
          </div>
        </div>
      </div>

      {/* ===================== INFO ===================== */}
      <div className={`p-4 rounded-xl ${cardBg} border ${borderColor} text-center`}>
        <p className="text-sm text-gray-500">
          © 2024 ComercioApp - Tu gestión de ventas
        </p>
      </div>
    </div>
  );
}
