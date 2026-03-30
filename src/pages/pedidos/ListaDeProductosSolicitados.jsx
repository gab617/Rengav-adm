import React, { useState, useMemo } from "react";
import { useAppContext } from "../../contexto/Context";

export function ListaDeProductosSolicitados({ pedidos, dark }) {
  const { 
    restarPedido, 
    agregarPedido, 
    eliminarPedido, 
    handleInputPedido, 
    handleBlurPedido 
  } = useAppContext();
  
  const [expanded, setExpanded] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [inputValue, setInputValue] = useState("");

  if (!pedidos || pedidos.length === 0) {
    return (
      <div
        className={`p-4 text-center italic rounded-xl ${
          dark ? "bg-gray-700/50 text-gray-400" : "bg-gray-100 text-gray-500"
        }`}
      >
        🛒 No hay productos en la lista
      </div>
    );
  }

  const totalItems = pedidos.reduce((acc, p) => acc + p.cantidad, 0);
  const totalPrecio = pedidos.reduce(
    (acc, p) => acc + (parseFloat(p.precio_compra) || 0) * p.cantidad,
    0
  );

  const bgCard = dark ? "bg-gray-700/50" : "bg-gray-100";
  const bgItem = dark ? "bg-gray-700" : "bg-white";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const borderColor = dark ? "border-gray-600" : "border-gray-200";
  const inputBg = dark ? "bg-gray-600 text-white" : "bg-gray-50 text-gray-900";
  const qtyColor = dark ? "text-blue-400" : "text-blue-600";

  const startEdit = (item) => {
    setEditandoId(item.id);
    setInputValue(String(item.cantidad));
  };

  const handleEditChange = (value) => {
    setInputValue(value);
  };

  const finishEdit = (id) => {
    const value = parseInt(inputValue);
    if (!isNaN(value) && value > 0) {
      handleBlurPedido(id, value);
    }
    setEditandoId(null);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Enter") {
      finishEdit(id);
    } else if (e.key === "Escape") {
      setEditandoId(null);
    }
  };

  return (
    <div className={`rounded-xl ${bgCard}`}>
      {/* HEADER */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className={`font-bold ${textPrimary}`}>Lista de Pedido</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs ${dark ? "bg-blue-500/30 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
            {pedidos.length}
          </span>
        </div>
        <span className={`text-sm ${textSecondary}`}>
          {expanded ? "▼" : "▲"} {totalItems} items · ${totalPrecio.toLocaleString()}
        </span>
      </div>

      {/* CONTENIDO */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[500px]" : "max-h-0"}`}>
        <div className="p-3 pt-0 space-y-2 max-h-[40vh] overflow-y-auto">
          {pedidos.map((item, index) => {
            const isEditing = editandoId === item.id;
            const precioTotal = (parseFloat(item.precio_compra || item.precio) || 0) * item.cantidad;
            const nombre = item.products_base?.name || item.name || item.nombre || "Producto sin nombre";
            const marca = item.products_base?.brand || item.products_base?.brand_text || item.brand || null;
            const stock = item.stock ?? item.cantidad_stock ?? 0;

            return (
              <div
                key={item.id}
                className={`${bgItem} rounded-xl p-3 border ${borderColor} transition-all hover:shadow-md`}
              >
                {/* INFO PRINCIPAL */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${textPrimary} truncate`}>
                      {index + 1}. {nombre}
                    </p>
                    {marca && (
                      <p className={`text-xs ${textSecondary}`}>
                        {marca}
                      </p>
                    )}
                  </div>
                  
                  {/* PRECIO TOTAL */}
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${dark ? "text-green-400" : "text-green-600"}`}>
                      ${precioTotal.toLocaleString()}
                    </p>
                    <p className={`text-xs ${textSecondary}`}>
                      ${parseFloat(item.precio_compra || item.precio || 0).toLocaleString()} c/u
                    </p>
                  </div>
                </div>

                {/* CONTROLES */}
                <div className="flex items-center justify-between gap-2">
                  {/* ELIMINAR */}
                  <button
                    onClick={() => eliminarPedido(item.id)}
                    className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                      dark 
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                        : "bg-red-100 text-red-500 hover:bg-red-200"
                    }`}
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* CANTIDAD */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => restarPedido(item.id)}
                      className={`w-8 h-8 rounded-lg font-bold transition-all hover:scale-110 ${
                        dark
                          ? "bg-gray-600 hover:bg-gray-500 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      −
                    </button>

                    {isEditing ? (
                      <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => handleEditChange(e.target.value)}
                        onBlur={() => finishEdit(item.id)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        className={`w-14 h-8 text-center rounded-lg border ${inputBg} font-bold`}
                        min="1"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(item)}
                        className={`w-14 h-8 rounded-lg border ${inputBg} font-bold ${qtyColor}`}
                        title="Click para editar"
                      >
                        {item.cantidad}
                      </button>
                    )}

                    <button
                      onClick={() => agregarPedido(item)}
                      className={`w-8 h-8 rounded-lg font-bold transition-all hover:scale-110 ${
                        dark
                          ? "bg-blue-500 hover:bg-blue-400 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      +
                    </button>
                  </div>

                  {/* STOCK INFO */}
                  {stock > 0 && (
                    <span className={`text-xs ${textSecondary}`}>
                      Stock: {stock}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
