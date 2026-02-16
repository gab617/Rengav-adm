import React from "react";

export function ListaDeProductosSolicitados({ pedidos, dark }) {
  if (!pedidos || pedidos.length === 0) {
    return (
      <div
        className={`p-4 text-center italic ${
          dark ? "text-gray-400" : "text-gray-500"
        }`}
      >
        🛒 No hay productos en la lista.
      </div>
    );
  }

  const bg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const border = dark ? "border-gray-600" : "border-gray-300";
  const qty = dark ? "text-blue-400" : "text-blue-600";

  return (
    <div className={` rounded-xl shadow-md ${bg}`}>
      <h2 className="text-xl font-bold mb-3">📝 Lista de Pedido</h2>

      {/* CONTENEDOR CON SCROLL */}
      <div className="max-h-[50vh] overflow-y-auto pr-2">
        <ul className="flex flex-col gap-2">
          {pedidos.map((item, index) => (
            <li
              key={item.id}
              className={`flex justify-between items-center border-b pb-1 ${border}`}
            >
              <span className="font-medium">
                {index + 1}. {item.products_base.name}
              </span>

              <span className={`font-semibold ${qty}`}>
                ✘ {item.cantidad}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
