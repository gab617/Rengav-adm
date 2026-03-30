import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../../../contexto/Context";
import "./LiPedido.css";

export function LiPedido({ prod, categoria, enPedido }) {
  const {
    pedidos,
    agregarPedido,
    restarPedido,
    eliminarPedido,
    handleInputPedido,
    handleBlurPedido,
    preferencias,
  } = useAppContext();

  const dark = preferencias?.theme === "dark";
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [justAdded, setJustAdded] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function capitalizarMayus(texto) {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  const pedidoExistente = pedidos.find((p) => p.id === prod.id);
  const cantidad = pedidoExistente ? pedidoExistente.cantidad : 0;

  const bgBase = dark ? `${categoria.color}30` : `${categoria.color}40`;
  const bgHover = dark ? `${categoria.color}50` : categoria.color;
  const bgEnPedido = dark
    ? "bg-green-500/10 border-green-500/40"
    : "bg-green-50 border-green-300";
  const borderAdded = dark ? "border-green-400" : "border-green-500";

  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const btnBgDark = dark
    ? "bg-gray-600 text-gray-200"
    : "bg-gray-300 text-black";
  const btnBgLight = dark ? "hover:bg-gray-500" : "hover:bg-gray-400";

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-300" : "text-gray-600";
  const textBrand = dark ? "text-gray-400" : "text-gray-500";

  const handleAgregar = (e) => {
    e.stopPropagation();
    agregarPedido(prod);
    setJustAdded(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setJustAdded(false);
    }, 600);
  };

  const handleRestar = (e) => {
    e.stopPropagation();
    restarPedido(prod.id);
  };

  const handleEliminar = (e) => {
    e.stopPropagation();
    eliminarPedido(prod.id);
  };

  const handleInput = (e) => {
    e.stopPropagation();
    handleInputPedido(prod.id, e.target.value);
  };

  const handleBlur = (e) => {
    e.stopPropagation();
    handleBlurPedido(prod.id, e.target.value);
  };

  // Obtener nombre del producto - verificar múltiples rutas
  const nombre =
    prod.products_base?.name ||
    prod.name ||
    prod.nombre ||
    "Producto sin nombre";
  const marca =
    prod.products_base?.brand ||
    prod.products_base?.brand_text ||
    prod.brand ||
    null;
  const precio = parseFloat(prod.precio_compra || prod.precio || 0);
  const stock = prod.stock ?? prod.cantidad_stock ?? 0;

  return (
    <div
      className={`flex flex-col md:flex-row w-full gap-2 rounded-xl border transition-all duration-300 mb-2 ${
        enPedido ? bgEnPedido : "border-transparent"
      } ${justAdded ? `ring-2 ring-green-500 ${borderAdded}` : ""}`}
      style={{
        background: enPedido ? undefined : bgBase,
      }}
    >
      {/* INFO */}
      <div
        className={`flex-1 cursor-pointer transition-all duration-200 w-full ${
          !enPedido ? "hover:opacity-90" : ""
        }`}
        style={{
          background: enPedido ? undefined : bgBase,
        }}
        onClick={handleAgregar}
      >
        <div
          className={`flex justify-between flex-col md:flex-row md:items-center text-sm md:text-base font-semibold p-3 md:p-4 ${textPrimary}`}
        >
          <div className="flex flex  items-center gap-2 min-w-0">
            {justAdded && (
              <span className="text-green-500 text-xs animate-bounce">✓</span>
            )}
            <p className="p-pedido  flex-1 truncate" title={nombre}>
              {nombre}
            </p>
            {marca && (
              <p className={`p-pedido text-xs md:text-sm ${textBrand}`}>
                {capitalizarMayus(marca)}
              </p>
            )}
          </div>
          <div className="gap-1 flex">
            <p className={`p-pedido text-sm ${textSecondary}`}>
              <span className="md:hidden">$ </span>${precio.toLocaleString()}
            </p>
            <p className={`p-pedido text-sm ${textSecondary}`}>
              <span className="">Stock: </span>
              {stock}
            </p>
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <div
        className={`px-2 md:px-3 flex items-center justify-center gap-1 md:gap-2 transition-all duration-300 ${
          cantidad > 0 || cantidad === "" ? "opacity-100" : "opacity-60"
        }`}
      >
        <button
          className={`p-2 rounded-lg transition-all hover:scale-110 ${
            dark
              ? "bg-red-500/30 text-red-400 hover:bg-red-500/50"
              : "bg-red-100 text-red-500 hover:bg-red-200"
          }`}
          onClick={handleEliminar}
          title="Quitar del pedido"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <button
          className={`w-8 h-8 md:w-9 md:h-9 rounded-lg font-bold transition-all hover:scale-110 ${btnBgDark} ${btnBgLight}`}
          onClick={handleRestar}
        >
          −
        </button>

        <input
          type="number"
          className={`w-12 md:w-14 text-center border rounded-lg font-bold ${inputBg}`}
          value={cantidad === 0 ? "" : cantidad}
          min="1"
          onClick={(e) => e.stopPropagation()}
          onChange={handleInput}
          onBlur={handleBlur}
        />

        <button
          className={`w-8 h-8 md:w-9 md:h-9 rounded-lg font-bold transition-all hover:scale-110 ${
            dark
              ? "bg-blue-500 hover:bg-blue-400 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          onClick={handleAgregar}
        >
          +
        </button>
      </div>
    </div>
  );
}
