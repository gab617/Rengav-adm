import React from "react";

import { UlProducts } from "./components/UlProducts";
import { Carrito } from "../carrito/Carrito";
import { useAppContext } from "../../contexto/Context";

export function Productos() {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  return (
    <div className={`p-1 min-h-screen transition-colors ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex flex-wrap gap-4">
        {/* Lista de productos ocupa el espacio disponible */}
        <div className="flex-1 transition-colors">
          <UlProducts />
        </div>

        {/* Carrito con ancho dinámico y diseño más atractivo */}
        <div className="w-full md:w-[20%] lg:w-[20%] p-4 shadow-lg rounded-lg transition-colors">
          <Carrito />
        </div>
      </div>
    </div>
  );
}
