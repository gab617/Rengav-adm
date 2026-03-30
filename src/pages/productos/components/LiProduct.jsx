import React, { useEffect, useState } from "react";
import { useAppContext } from "../../../contexto/Context";
import { EditProduct } from "./EditProduct";
import { DeleteProduct } from "./DeleteProduct";
import { Balanza } from "./liProductComponents/Balanza";

function capitalizarMayus(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function LiProduct({
  prod,
  color,
  vista = "mosaico",
  tamano = "normal",
}) {
  const {
    actualizarProducto,
    eliminarProducto,
    agregarProductoCarrito,
    preferencias,
    carrito,
    actualizarStockEnCarrito,
  } = useAppContext();

  const dark = preferencias?.theme === "dark";

  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [editedProduct, setEditedProduct] = useState({
    ...prod,
    nombre:
      prod.tipo === "custom" ? prod.user_custom_products?.name : prod.nombre,
  });
  const [pesoSeleccionado, setPesoSeleccionado] = useState(null);

  useEffect(() => {
    setEditedProduct({
      ...prod,
      nombre:
        prod.tipo === "custom" ? prod.user_custom_products?.name : prod.nombre,
    });
    setIsEditing(false);
    setShowConfirmDelete(false);
  }, [prod.id]);

  const esPeso = prod.products_base?.type_unit === "weight";
  const enCarrito = carrito.some((item) => item.id === prod.id);
  const cantidadEnCarrito = carrito
    .filter((item) => item.id === prod.id)
    .reduce((acc, item) => acc + (esPeso ? Number(item.cantidad) : 1), 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "stock") {
      const numValue = Number(value);
      if (numValue < 0) return;
    }
    setEditedProduct({ ...editedProduct, [name]: value });
  };

  const handleCancel = () => setIsEditing(false);

  const handleAgregarCarrito = () => {
    if (esPeso) {
      if (!pesoSeleccionado) {
        alert("Seleccioná un peso primero");
        return;
      }

      const precioCalculado = Number(
        (Number(prod.precio_venta) * pesoSeleccionado).toFixed(2),
      );

      agregarProductoCarrito(prod, color, {
        peso: pesoSeleccionado,
        precioCalculado,
      });
    } else {
      agregarProductoCarrito(prod, color);
    }
  };

  const handleSubmit = async () => {
    const payload = { ...editedProduct };
    if (payload.stock < 0) payload.stock = 0;
    console.log(payload);
    delete payload.products_base;
    delete payload.id;
    await actualizarProducto(prod.id, payload);
    actualizarStockEnCarrito([{ id_producto: prod.id, stock: Number(payload.stock) }]);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await eliminarProducto(prod.id);
    setShowConfirmDelete(false);
  };

  const precioFormateado = parseInt(prod.precio_venta)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const sizeClass =
    tamano === "chico"
      ? "scale-90 text-sm"
      : tamano === "grande"
        ? "scale-105 text-xl"
        : "text-base";

  const enCarritoClass = enCarrito
    ? dark
      ? "border-yellow-500 shadow-yellow-500/30 shadow-lg"
      : "border-yellow-400 shadow-yellow-400/50 shadow-lg"
    : "";

  const sinStock = prod.stock <= 0;

  const borderClass = sinStock
    ? "border-red-500"
    : enCarrito
      ? "border-yellow-500"
      : dark
        ? "border-gray-600"
        : "border-gray-400";

  return (
    <li
      key={prod.id}
      className={`
        group relative
        rounded-xl border-2 transition-all duration-200
        ${vista === "listado"
          ? "flex items-center justify-between md:p-2 md:h-[60px] gap-2"
          : "flex flex-col justify-between p-2 min-h-[110px]"
        }
        ${sizeClass}
        ${borderClass}
        ${enCarrito ? "ring-2 ring-yellow-500 ring-offset-2" : ""}
        group-hover:shadow-lg
      `}
      style={{
        backgroundColor: sinStock
          ? dark
            ? "rgba(220, 38, 38, 0.2)"
            : "rgba(254, 226, 226, 1)"
          : enCarrito
            ? dark
              ? "rgba(250, 204, 21, 0.15)"
              : "rgba(250, 204, 21, 0.1)"
            : dark
              ? "#1f2937"
              : "white",
        color: dark ? "white" : "black",
      }}
    >
      {enCarrito && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
          {esPeso ? `${cantidadEnCarrito.toFixed(3)}kg` : `x${cantidadEnCarrito}`}
        </div>
      )}

      {sinStock && (
        <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10 animate-pulse">
          SIN STOCK
        </div>
      )}

      {/* ================= VISTA LISTADO ================= */}
      {vista === "listado" ? (
        <div
          className={`flex flex-col md:flex-row justify-between w-full px-2 gap-2 ${
            dark ? "text-white" : "text-gray-900"
          }`}
        >
          <div className="flex flex-col md:flex-row w-full md:items-center gap-1 md:gap-2 overflow-hidden">
            {enCarrito && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2">
                <div className={`w-2 h-2 rounded-full ${dark ? "bg-yellow-500" : "bg-yellow-400"} animate-pulse`} />
              </div>
            )}
            <div
              className="hidden md:block w-6 h-6 rounded-md shrink-0"
              style={{ backgroundColor: color }}
            ></div>

            <div className="flex flex-col sm:flex-row sm:items-center w-full truncate">
              <div className="flex gap-1 items-center">
                <span className="font-semibold text-base md:text-xl truncate max-w-full flex items-center gap-1">
                  {prod.tipo === "custom"
                    ? prod.user_custom_products?.name
                    : prod.products_base?.name}
                  {esPeso && (
                    <span className="text-lg" title="Producto por peso">⚖️</span>
                  )}
                  {enCarrito && (
                    <span className="text-green-500 text-sm">✓</span>
                  )}
                </span>

                <div
                  className={`border rounded-xl px-2 md:px-3 py-0.5 md:py-1 shadow-md text-sm md:text-base ${
                    dark
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-gray-100/40 border-gray-600/40 text-gray-900"
                  }`}
                >
                  <strong className="block truncate max-w-[10rem] md:max-w-none">
                    {capitalizarMayus(
                      prod.products_base?.brand ??
                        prod.products_base?.brand_text ??
                        "-",
                    )}
                  </strong>
                </div>
              </div>
              <div
                className={`flex items-center justify-between w-full px-[0.1em] py-1 rounded-md border
  ${
    dark
      ? "bg-white/5 border-white/10 text-white"
      : "bg-gray-100/40 border-gray-600/40 text-gray-900"
  }`}
              >
                <span className="font-medium">
                  #️⃣​{`${prod.custom_id ? " C-" : ""}${prod.id}`}
                </span>

                {esPeso && (
                  <Balanza
                    dark={dark}
                    onChange={(peso) => {
                      setPesoSeleccionado(peso);
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center w-full md:w-auto md:mt-0">
            <div className="flex justify-between items-center w-full md:w-auto md:mt-0">
              <div
                className={`flex items-center gap-2 px-1 py-1 md:py-0 rounded-lg border ${
                  dark
                    ? "border-gray-600 bg-gray-800"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <span
                  className={`text-base md:text-xl font-bold tracking-tight ${
                    dark ? "text-green-400" : "text-green-900"
                  }`}
                >
                  ${precioFormateado}
                </span>

                <span
                  className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}
                >
                  |
                </span>

                <span
                  className={`text-sm md:text-base md:text-center font-medium ${
                    prod.stock <= 5
                      ? "text-red-500"
                      : dark
                        ? "text-gray-300"
                        : "text-gray-600"
                  }`}
                >
                  Stock: {prod.stock}
                </span>
              </div>
            </div>

            <div className="flex gap-1">
              <button
                className={`
                px-2 py-1 md:px-[.3em] md:p-[.2em]
                text-lg md:text-xl
                rounded
                active:scale-90
                transition-all duration-200
                ${enCarrito
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                  : "bg-green-600 text-white hover:bg-green-500 active:bg-green-700"
                }
  `}
                onClick={handleAgregarCarrito}
                title={enCarrito ? "Agregar más" : "Agregar al carrito"}
              >
                {enCarrito ? "➕" : "🛒"}
              </button>

              <button
                className="px-2 py-1 md:px-[.3em] md:p-[.2em] text-lg md:text-xl bg-blue-600 text-white rounded hover:bg-blue-400"
                onClick={() => setIsEditing(!isEditing)}
                title="Editar producto"
              >
                ✏️
              </button>

              <button
                className="px-2 py-1 md:px-[.3em] md:p-[.2em] text-lg md:text-xl bg-red-600 text-white rounded hover:bg-red-400"
                onClick={() => setShowConfirmDelete(true)}
                title="Eliminar producto"
              >
                ❌
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col">
          <div className="flex flex-col items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>
                  {prod.tipo === "custom"
                    ? prod.user_custom_products?.name
                    : prod.products_base?.name}
                </span>
                {esPeso && <span className="text-sm shrink-0">⚖️</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                  ${precioFormateado}
                </span>
                <span className={`text-xs ${prod.stock <= 5 ? "text-red-500 font-bold" : dark ? "text-gray-400" : "text-gray-500"}`}>
                  Stock: {prod.stock}
                </span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
                  enCarrito
                    ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                    : esPeso && !pesoSeleccionado
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-500 text-white"
                }`}
                onClick={() => {
                  if (esPeso && pesoSeleccionado && pesoSeleccionado > 0) {
                    agregarProductoCarrito(prod, color, { peso: pesoSeleccionado });
                    setPesoSeleccionado(null);
                  } else if (!esPeso) {
                    handleAgregarCarrito();
                  }
                }}
                disabled={esPeso && !pesoSeleccionado}
              >
                {esPeso ? (
                  pesoSeleccionado ? pesoSeleccionado.toFixed(2) : "⚖️"
                ) : enCarrito ? "➕" : "🛒"}
              </button>
              <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${
                  dark ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-500 hover:bg-blue-400 text-white"
                }`}
                onClick={() => setIsEditing(!isEditing)}
              >
                ✏️
              </button>
              <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${
                  dark ? "bg-red-600 hover:bg-red-500 text-white" : "bg-red-500 hover:bg-red-400 text-white"
                }`}
                onClick={() => setShowConfirmDelete(true)}
              >
                🗑️
              </button>
            </div>
          </div>

          {enCarrito && (
            <div className={`text-xs font-medium mb-1.5 ${dark ? "text-yellow-400" : "text-yellow-700"}`}>
              ✓ {esPeso ? `${cantidadEnCarrito.toFixed(3)}kg` : `x${cantidadEnCarrito} en carrito`}
            </div>
          )}

          {esPeso && (
            <div className={`flex  flex-col items-center gap-1.5 p-1 rounded-lg border text-base ${
              dark ? "border-yellow-500/30 bg-yellow-500/10" : "border-yellow-200 bg-yellow-50"
            }`}>
              <input
                type="text"
                inputMode="numeric"
                value={pesoSeleccionado !== null ? Math.round(pesoSeleccionado * 1000) : ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, "");
                  setPesoSeleccionado(val ? Number(val) / 1000 : null);
                }}
                placeholder="gr"
                className={`w-14 text-center px-1.5 py-1 rounded font-medium ${
                  dark ? "bg-gray-800 text-white border border-gray-600" : "bg-white text-gray-900 border border-gray-300"
                }`}
              />
              <div className="flex gap-0.5 flex-1">
                {[0.05, 0.1, 0.5, 1].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      if (enCarrito) {
                        agregarProductoCarrito(prod, color, { peso: val });
                      } else {
                        setPesoSeleccionado((prev) => (prev || 0) + val);
                      }
                    }}
                    className={` flex-1 p-1 rounded text-center font-medium transition-colors ${
                      dark ? "bg-gray-700 hover:bg-yellow-500/30" : "bg-white hover:bg-yellow-100 border border-gray-200"
                    }`}
                  >
                    {val >= 1 ? "1k" : val * 1000 + "g"}
                  </button>
                ))}
              </div>
              {pesoSeleccionado && (
                <button
                  onClick={() => setPesoSeleccionado(null)}
                  className={`w-6 h-6 rounded flex items-center justify-center ${
                    dark ? "hover:bg-gray-600" : "hover:bg-gray-200"
                  }`}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            {capitalizarMayus(prod.products_base?.brand || prod.products_base?.brand_text || "-")}
          </div>
        </div>
      )}

      {/* ================= MODALES ================= */}
      <div className="relative">
        {isEditing && (
          <EditProduct
            editedProduct={editedProduct}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            handleCancel={handleCancel}
          />
        )}
        {showConfirmDelete && (
          <DeleteProduct
            handleDelete={handleDelete}
            setShowConfirmDelete={setShowConfirmDelete}
          />
        )}
      </div>
    </li>
  );
}
