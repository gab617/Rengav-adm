import React from "react";
import { LiVenta } from "../LiVenta";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import "dayjs/locale/es"; // Importamos el idioma español

export function FiltroPorSemana({
  ventasFiltradas,
  mostrarDetalles,
  ventaActiva,
  toggleVenta,
  dark = false, // <-- agregamos prop opcional para el tema
}) {
  return (
    <div>
      {Object.keys(ventasFiltradas).map((dia) => (
        <div key={dia} className="mb-4">
          <h3
            className={`font-semibold text-lg ${
              dark ? "text-gray-200" : "text-gray-900"
            }`}
          >
            {dayjs(dia).format("dddd, D MMMM YYYY")}
          </h3>
          <ul className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {ventasFiltradas[dia].map((venta, index) => (
              <LiVenta
                key={index}
                venta={venta}
                mostrarDetalles={mostrarDetalles}
                ventaActiva={ventaActiva}
                index={index}
                toggleVenta={toggleVenta}
                dark={dark} // <-- pasar prop dark a LiVenta también
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
