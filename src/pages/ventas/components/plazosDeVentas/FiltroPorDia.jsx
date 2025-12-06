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
      <ul className="w-[100%] lg:w-[95%] grid grid-cols-2 md:grid-cols-5 sm:grid-cols-3 lg:grid-cols-8 2xl:grid-cols-10 gap-1">
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
