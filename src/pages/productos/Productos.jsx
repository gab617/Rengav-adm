import React from "react";

import { UlProducts } from "./components/UlProducts";
import { useAppContext } from "../../contexto/Context";
import { CarritoDrawer } from "./CarritoDrawer";

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
        <CarritoDrawer />

      </div>
    </div>
  );
}
