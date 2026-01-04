import React, { useEffect, useState } from "react";
import { useAppContext } from "../../../contexto/Context";
import { EditProduct } from "./EditProduct";
import { DeleteProduct } from "./DeleteProduct";

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
  } = useAppContext();

  const dark = preferencias?.theme === "dark";

  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [editedProduct, setEditedProduct] = useState({
    ...prod,
    nombre:
      prod.tipo === "custom" ? prod.user_custom_products?.name : prod.nombre,
  });

  const handleChange = (e) => {
    setEditedProduct({ ...editedProduct, [e.target.name]: e.target.value });
  };

  const handleCancel = () => setIsEditing(false);

  const handleSubmit = async () => {
    const payload = { ...editedProduct };
    console.log(payload)
    delete payload.products_base;
    delete payload.id;
    await actualizarProducto(prod.id, payload);
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

  const vistaClass =
    vista === "listado"
      ? "flex items-center justify-between md:p-2 md:h-[60px] gap-2"
      : "flex flex-col justify-between p-2 min-h-[110px]";

  useEffect(() => {
    setEditedProduct({
      ...prod,
      nombre:
        prod.tipo === "custom" ? prod.user_custom_products?.name : prod.nombre,
    });
  }, [prod]);
  return (
    <li
      key={prod.id}
      className={`rounded-xl border transition-all ${vistaClass} ${sizeClass} ${
        dark ? "border-gray-600" : "border-gray-400"
      }`}
      style={{
        backgroundColor:
          prod.stock <= 0
            ? dark
              ? "rgba(255,0,0,0.4)"
              : "rgba(251,0,0,0.4)"
            : dark
            ? "#1f2937" // gray-800
            : "white",
        color: dark ? "white" : "black",
      }}
    >
      {/* ================= VISTA LISTADO ================= */}
      {vista === "listado" ? (
        <div
          className={`flex flex-col md:flex-row justify-between w-full px-2 gap-2 ${
            dark ? "text-white" : "text-gray-900"
          }`}
        >
          {/* INFO PRODUCTO */}
          <div className="flex flex-col md:flex-row w-full md:items-center gap-1 md:gap-2 overflow-hidden">
            <div
              className="hidden md:block w-6 h-6 rounded-md shrink-0"
              style={{ backgroundColor: color }}
            ></div>

            <div className="flex flex-wrap items-center gap-2 w-full truncate">
              <span className="font-semibold text-base md:text-xl truncate max-w-full">
                {prod.tipo === "custom"
                  ? prod.user_custom_products?.name
                  : prod.products_base?.name}
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
                      "-"
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* PRECIO + ACCIONES */}
          <div className="flex justify-between items-center w-full md:w-auto mt-1 md:mt-0">
            <div className="">
              <span
                className={`text-sm md:text-xl font-bold ${
                  dark ? "text-gray-100" : "text-gray-700"
                }`}
              >
                ${precioFormateado}
              </span>
              <span className="ml-1 text-base md:text-base">
                • Stock: {prod.stock}
              </span>
            </div>

            <div className="flex gap-1">
              <button
                className="px-2 py-1 md:px-[.3em] md:p-[.2em] text-lg md:text-xl bg-green-600 text-white rounded hover:bg-green-400"
                onClick={() => agregarProductoCarrito(prod, color)}
                title="Agregar al carrito"
              >
                🛒
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
        <>
          {/* ================= VISTA MOSAICO ================= */}
          <div className="w-full block max-h-[5em] overflow-y-auto">
            <div
              className={`flex flex-col justify-between border rounded-lg p-[0.1em] shadow-xl ${
                dark ? "bg-gray-700 text-white" : "bg-white text-gray-900"
              }`}
            >
              <strong className="block text-base">
                {prod.tipo === "custom"
                  ? prod.user_custom_products?.name
                  : prod.products_base?.name}
              </strong>
              <hr />
              <strong className="block text-base">
                ${precioFormateado} •• Stock: {prod.stock} ••
              </strong>
            </div>
            <span className={dark ? "text-gray-300" : "text-gray-600"}>
              {prod.descripcion}
            </span>
          </div>
          <div className="flex justify-between items-center">
            {/* Botonera */}
            <div className="flex  flex-row gap-[0.15em] items-start">
              <button
                className="cursor-pointer px-[.3em] p-[.2em] text-xl bg-green-600 text-white rounded hover:bg-green-400"
                onClick={() => agregarProductoCarrito(prod, color)}
              >
                🛒
              </button>
              <button
                className="cursor-pointer px-[.3em] p-[.2em] text-xl bg-blue-600 text-white rounded hover:bg-blue-400"
                onClick={() => setIsEditing(!isEditing)}
              >
                ✏️
              </button>
              <button
                className="cursor-pointer px-[.3em] p-[.2em] text-xl bg-red-600 text-white rounded hover:bg-red-400"
                onClick={() => setShowConfirmDelete(true)}
              >
                ❌
              </button>
            </div>
            <div
              className={`border rounded-xl px-3 py-1 inline-block shadow-md ${
                dark
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-gray-100/40 border-gray-600/40 text-gray-900"
              }`}
            >
              <strong className="block text-base">
                {prod.tipo === "custom"
                  ? capitalizarMayus(prod.user_custom_products?.brand)
                  : capitalizarMayus(prod.products_base?.brand)}
              </strong>
            </div>
          </div>
        </>
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
