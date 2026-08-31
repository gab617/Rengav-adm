import React from "react";
import { LiVenta } from "../LiVenta";

export function FiltroPorDia({
  ventasFiltradas,
  mostrarDetalles,
  ventaActiva,
  toggleVenta,
}) {
  return (
    <div>
      <ul className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {ventasFiltradas.map((venta, index) => (
          <LiVenta
            key={index}
            venta={venta}
            mostrarDetalles={mostrarDetalles}
            ventaActiva={ventaActiva}
            index={index}
            toggleVenta={toggleVenta}
          />
        ))}
      </ul>
    </div>
  );
}
