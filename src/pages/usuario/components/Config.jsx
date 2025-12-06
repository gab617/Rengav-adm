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

  const handleChangeTheme = (tema) => {
    updatePreferencias({ theme: tema });
  };

  return (
    <div
      className={`flex flex-col  rounded-2xl shadow-xl ${bgBase} ${textBase}`}
    >

      {/* ===================== SELECCIÓN DE TEMA ===================== */}
      <div className="flex flex-col ">
        <h2 className="text-xl font-semibold text-center">Tema de la aplicación</h2>

        <div className="grid grid-cols-2 gap-[2em]">
          {/* Tema Claro */}
          <div
            onClick={() => handleChangeTheme("light")}
            className={`rounded-xl cursor-pointer transition-all border 
              ${
                preferencias?.theme === "light"
                  ? "border-blue-500 scale-105 shadow-lg"
                  : "border-transparent opacity-70 hover:opacity-100"
              }
            `}
          >
            <img
              src="./tema-light.png"
              alt="Tema claro"
              className="w-[50%] mx-auto h-[5em] object-center rounded-lg"
            />
            <p className="text-center mt-2 font-medium">Claro</p>
          </div>

          {/* Tema Oscuro */}
          <div
            onClick={() => handleChangeTheme("dark")}
            className={`rounded-xl p-2 cursor-pointer transition-all border 
              ${
                preferencias?.theme === "dark"
                  ? "border-blue-500 scale-105 shadow-lg"
                  : "border-transparent opacity-70 hover:opacity-100"
              }
            `}
          >
            <img
              src="./tema-dark.png"
              alt="Tema oscuro"
              className="w-[50%] mx-auto h-[5em] object-center rounded-lg"
            />
            <p className="text-center mt-2 font-medium">Oscuro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
