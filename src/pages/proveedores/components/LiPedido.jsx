import React from "react";
import { useAppContext } from "../../../contexto/Context";
import "./LiPedido.css";

export function LiPedido({ prod, categoria }) {
  const {
    pedidos,
    agregarPedido,
    restarPedido,
    eliminarPedido,
    handleInputPedido,
    handleBlurPedido,
    preferencias, // { theme: "dark" | "light" }
  } = useAppContext();

  const dark = preferencias?.theme === "dark";

  // Verificar si el producto está en la lista
  const pedidoExistente = pedidos.find((p) => p.id === prod.id);
  const cantidad = pedidoExistente ? pedidoExistente.cantidad : 0;

  // Mantener color de categoría
  const bgBase = dark
    ? `${categoria.color}40` // tenue en dark (20% opacidad)
    : `${categoria.color}50`; // ligero en light (30% opacidad)
  const bgHover = dark ? `${categoria.color}66` : categoria.color; // más vivo en hover

  const inputBg = dark ? "bg-gray-700 text-gray-200 border-gray-600" : "bg-white text-gray-900 border-gray-300";
  const btnBg = dark ? "bg-gray-600 text-gray-200" : "bg-gray-300 text-black";
  const btnHover = dark ? "hover:bg-gray-500" : "hover:bg-gray-400";

  return (
    <div className="flex w-full">
      <div
        key={prod.id}
        className="cursor-pointer transition-all duration-200 w-full"
        style={{
          background: bgBase,
          transition: "background 0.1s ease-in-out, transform 0.1s ease-in-out",
        }}
        onClick={() => agregarPedido(prod)}
        onMouseEnter={(e) => e.currentTarget.style.setProperty("background", bgHover)}
        onMouseLeave={(e) => e.currentTarget.style.setProperty("background", bgBase)}
      >
        {/* Info del producto */}
        <div className={`flex text-xl font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
          <p className="p-pedido">{prod.products_base.name}</p>
          <p className="p-pedido">Stock: {prod.stock}</p>
          <p className="p-pedido">
            Precio Proveed.: $
            {parseInt(prod.precio_compra)
              .toFixed(2)
              .replace(/\.00$/, "")
              .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </p>
        </div>
      </div>

      {/* Controles de cantidad (Solo si está agregado) */}
      <div
        className={`px-2 border-b rounded-xl flex items-center gap-2 transition-all duration-300 ease-in-out ${
          cantidad > 0 || cantidad === ""
            ? "opacity-100 scale-100"
            : "opacity-0 scale-90 pointer-events-none"
        }`}
      >
        <button
          className="px-2 py-1 bg-red-600 hover:bg-red-400 text-white rounded-md cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            eliminarPedido(prod.id);
          }}
        >
          ✘
        </button>
        <button
          className={`px-2 py-1 ${btnBg} ${btnHover} rounded-md font-bold text-lg`}
          onClick={(e) => {
            e.stopPropagation();
            restarPedido(prod.id);
          }}
        >
          -
        </button>

        {/* Input para modificar cantidad manualmente */}
        <input
          type="number"
          className={`w-12 text-center border rounded-md text-lg ${inputBg}`}
          value={cantidad === 0 ? "" : cantidad}
          min="1"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleInputPedido(prod.id, e.target.value)}
          onBlur={(e) => handleBlurPedido(prod.id, e.target.value)}
        />

        <button
          className={`px-2 py-1 ${btnBg} ${btnHover} rounded-md font-bold text-lg`}
          onClick={(e) => {
            e.stopPropagation();
            agregarPedido(prod);
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
