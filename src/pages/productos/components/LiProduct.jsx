import React, { useEffect, useState } from "react";
import { useAppContext } from "../../../contexto/Context";
import { EditProduct } from "./EditProduct";
import { DeleteProduct } from "./DeleteProduct";

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
      ? "flex items-center justify-between p-2 h-[60px] gap-2"
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
          className={` flex justify-between  items-center w-full px-2 ${
            dark ? "text-white" : "text-gray-900"
          }`}
        >
          <div className="flex w-full  items-center gap-2 overflow-hidden">
            <div
              className="w-6 h-6 rounded-md"
              style={{ backgroundColor: color }}
            ></div>
            <div className="flex items-center w-full truncate">
              <span className="font-semibold text-xl truncate ">
                {prod.tipo === "custom"
                  ? prod.user_custom_products?.name
                  : prod.products_base?.name}
              </span>
            </div>
          </div>

          <div className="flex gap-1 items-center">
            <span
              className={
                dark
                  ? "text-gray-100 text-xl font-bold truncate"
                  : "text-gray-700 text-xl font-bold truncate"
              }
            >
              ${precioFormateado} • Stock: {prod.stock}
            </span>
            <button
              className="px-[.3em] p-[.2em] text-xl bg-green-600 text-white rounded hover:bg-green-400"
              onClick={() => agregarProductoCarrito(prod, color)}
              title="Agregar al carrito"
            >
              🛒
            </button>
            <button
              className="px-[.3em] p-[.2em] text-xl bg-blue-600 text-white rounded hover:bg-blue-400"
              onClick={() => setIsEditing(!isEditing)}
              title="Editar producto"
            >
              ✏️
            </button>
            <button
              className="px-[.3em] p-[.2em] text-xl bg-red-600 text-white rounded hover:bg-red-400"
              onClick={() => setShowConfirmDelete(true)}
              title="Eliminar producto"
            >
              ❌
            </button>
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
