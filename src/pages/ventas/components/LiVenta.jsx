import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { useAppContext } from "../../../contexto/Context";
import "./scrollbar.css"; // Asegúrate de que este archivo contenga el estilo de scrollbar
const formatNumber = (num) => {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function LiVenta({
  venta,
  ventaActiva,
  mostrarDetalles,
  index,
  toggleVenta,
}) {
  const { eliminarVenta } = useAppContext();
  const isActive = ventaActiva === venta.id || mostrarDetalles;

  if (!venta) return null;

  // === Total de la venta ===
  const totalVenta = venta.user_sales_detail
    ?.reduce(
      (acc, prod) => acc + Number(prod.precio_unitario) * Number(prod.cantidad),
      0
    )
    .toFixed(2);

  // === Ganancia estimada ===
  const gananciaEstimada = venta.user_sales_detail
    ?.reduce(
      (acc, prod) =>
        acc +
        (Number(prod.precio_unitario) - Number(prod.precio_compra)) *
          Number(prod.cantidad),
      0
    )
    .toFixed(2);

  return (
    <div className="relative w-full">
      <hr />
      <li
        key={venta.id}
        className={`mb-[.5em] rounded-lg shadow-lg transition-all transform hover:scale-105 ${
          index % 2 === 0 ? "bg-blue-50" : "bg-yellow-50"
        } hover:bg-gray-100 min-h-40 flex flex-col justify-between`}
      >
        {/* CABECERA VENTA */}
        <div
          className="flex flex-col justify-between items-center cursor-pointer border-b p-1 hover:bg-gray-200 rounded-lg"
          onClick={() => toggleVenta(venta.id)}
        >
          <div className="w-full flex justify-between items-center">
            <p className="text-sm text-gray-600 font-bold">
              {dayjs(venta.fecha).format("DD-MM-YYYY HH:mm")}
            </p>
          </div>

          <div className="text-base lg:text-xl flex flex-col justify-between w-full text-start">
            {/* TOTAL */}
            <div className="flex flex-col justify-center ">
              <p className="text-lg font-medium text-gray-700">Total:</p>
              <p className="text-gray-900 font-bold text-base">
                ${formatNumber(totalVenta)}
              </p>
            </div>

            {/* CANTIDAD DE PRODUCTOS */}
            <div className="flex  gap-1 text-xs md:text-sm text-black">
              <p>Cant. prods.:</p>
              <strong>{venta.user_sales_detail?.length}</strong>
            </div>

            {/* GANANCIA */}
            <div className="flex   items-center gap-1">
              <span className="text-sm text-green-600">🟢</span>
              <p className="text-base text-green-600 font-bold">
                ${formatNumber(gananciaEstimada)}
              </p>
            </div>

            {/* BOTÓN ELIMINAR */}
            <div className="flex justify-end w-full px-3">
              <BotonEliminarConConfirmacion
                onEliminar={() => eliminarVenta(venta.id)}
              />
            </div>
          </div>
        </div>

        {/* DETALLES DE PRODUCTOS */}
        <div
          className={`mb-[.9em] transition-all duration-300 ease-in-out overflow-hidden ${
            isActive ? "max-h-[350px] opacity-100 p-[.2em]" : "max-h-0 opacity-0"
          }`}
        >
          {isActive && (
            <ul className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto p-[0.1em] border border-yellow-500/50 rounded-md custom-scrollbar">
              {venta.user_sales_detail.map((detalle) => {
                console.log(detalle);
                const totalDetalle =
                  Number(detalle.precio_unitario) * Number(detalle.cantidad);

                return (
                  <li
                    key={detalle.id}
                    className="text-base  bg-gray-300 rounded-md shadow-sm p-[.1em] flex flex-col "
                  >
                    {/* Nombre del producto */}
                    <p className="font-semibold text-gray-900">
                      {detalle.nombre_producto || "Producto"}
                    </p>

                    {/* Precio unitario */}
                    <p className="text-gray-700">
                      Precio: ${formatNumber(detalle.precio_unitario)}
                    </p>

                    {/* Cantidad */}
                    <p className="text-gray-800 flex items-center gap-1">
                      📦 <span className="text-sm">Cant:</span>{" "}
                      <strong>{detalle.cantidad}</strong>
                    </p>

                    {/* Total */}
                    <p className="font-semibold text-gray-900  border-t border-gray-400 ">
                      Total: ${formatNumber(totalDetalle)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </li>
    </div>
  );
}

export function BotonEliminarConConfirmacion({ onEliminar }) {
  const [confirmando, setConfirmando] = useState(false);
  const refContenedor = useRef(null);

  useEffect(() => {
    const manejarClickAfuera = (e) => {
      if (refContenedor.current && !refContenedor.current.contains(e.target)) {
        setConfirmando(false);
      }
    };

    if (confirmando) {
      document.addEventListener("mousedown", manejarClickAfuera);
    }

    return () => {
      document.removeEventListener("mousedown", manejarClickAfuera);
    };
  }, [confirmando]);

  return (
    <div ref={refContenedor} className="relative inline-block">
      <button
        onClick={() => setConfirmando(true)}
        className="w-full bg-red-400 text-white rounded-lg hover:bg-red-600 cursor-pointer transition duration-300 mt-2 px-[.3em]"
      >
        ✘
      </button>

      {confirmando && (
        <div className="absolute right-full ml-2  top-0 z-50 bg-white border border-gray-300 shadow-lg rounded-md p-2 flex flex-col items-start space-y-1 text-sm">
          <span className="text-gray-800 font-medium">¿Confirmar?</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                onEliminar();
                setConfirmando(false);
              }}
              className="bg-red-500 text-white px-2 rounded hover:bg-red-700"
            >
              Sí
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="bg-gray-300 text-gray-800 px-2 rounded hover:bg-gray-400"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
