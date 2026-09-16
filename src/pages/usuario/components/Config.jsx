import React from "react";
import { useAppContext } from "../../../contexto/Context";
import { IconSettings, IconCheck } from "../../../components/icons";

export function Config() {
  const { preferencias, updatePreferencias, cargandoPreferencias } =
    useAppContext();

  if (cargandoPreferencias)
    return (
      <div
        className={`p-4 text-center ${
          preferencias?.theme === "dark" ? "text-gray-300" : "text-gray-500"
        }`}
      >
        Cargando configuración...
      </div>
    );

  const dark = preferencias?.theme === "dark";

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const cardBg = dark ? "bg-gray-800" : "bg-white";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  const handleChangeTheme = (tema) => {
    updatePreferencias({ theme: tema });
  };

  const temas = [
    { id: "light", nombre: "Claro", img: "tema-light.png" },
    { id: "dark", nombre: "Oscuro", img: "tema-dark.png" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* HEADER */}
      <div className="flex items-center gap-2">
        <IconSettings className={`w-5 h-5 ${dark ? "text-blue-400" : "text-blue-500"}`} />
        <h2 className={`text-lg font-bold ${textPrimary}`}>Configuración</h2>
      </div>

      {/* SELECCIÓN DE TEMA */}
      <div className={`p-4 rounded-2xl ${cardBg} border ${borderColor}`}>
        <h3 className={`text-sm font-semibold mb-4 text-center ${textSecondary}`}>
          Tema de la aplicación
        </h3>

        <div className="flex gap-3 justify-center max-w-md mx-auto">
          {temas.map((tema) => {
            const activo = preferencias?.theme === tema.id;
            return (
              <div
                key={tema.id}
                onClick={() => handleChangeTheme(tema.id)}
                className={`relative flex-1 max-w-36 rounded-2xl cursor-pointer transition-all border p-2.5 sm:p-3 ${
                  activo
                    ? "border-blue-500 ring-2 ring-blue-500/30 shadow-lg"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {activo && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <IconCheck className="w-3 h-3 text-white" />
                  </div>
                )}
                <img
                  src={`${import.meta.env.BASE_URL}${tema.img}`}
                  alt={`Tema ${tema.nombre}`}
                  className="w-full h-14 sm:h-16 object-contain rounded-lg"
                />
                <p className={`text-center mt-2 font-medium text-sm ${textPrimary}`}>
                  {tema.nombre}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* INFO */}
      <div className={`p-3 rounded-2xl ${cardBg} border ${borderColor} text-center`}>
        <p className={`text-xs ${textSecondary}`}>
          © 2026 Rengav Admin - Gestión comercial
        </p>
      </div>
    </div>
  );
}