import React, { useState, useEffect } from "react";
import { useAppContext } from "../../contexto/Context";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function Carrito() {
  const {
    carrito,
    limpiarCarrito,
    eliminarProductoCarrito,
    actualizarCantidad,
    calcularTotal,
    crearVenta,
    actualizarProductosPostVenta,
    preferencias,
  } = useAppContext();

  const dark = preferencias?.theme === "dark";

  const [animatingItems, setAnimatingItems] = useState(new Set());

  useEffect(() => {
    const newSet = new Set(carrito.map((p) => p.id_user_product));
    setAnimatingItems(newSet);
  }, [carrito]);

  const handleConfirmarCompra = async () => {
    if (carrito.length === 0) return;

    const ventaExitosa = await crearVenta(
      carrito,
      actualizarProductosPostVenta
    );

    if (ventaExitosa) {
      toast.success("✅ Venta realizada con éxito.", {
        containerId: "carrito-toast",
      });
      limpiarCarrito();
    } else {
      toast.error("❌ Hubo un error al procesar la venta.", {
        containerId: "carrito-toast",
      });
    }
  };

  const mostrarConfirmacionVaciarCarrito = () => {
    const toastId = toast.info(
      ({ closeToast }) => (
        <div
          className={`p-3 rounded-xl shadow-md ${
            dark ? "bg-red-700 text-white" : "bg-red-100 text-black"
          }`}
        >
          <p className="mb-2 font-semibold">
            ¿Seguro que deseas vaciar el carrito?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                limpiarCarrito();
                toast.dismiss(toastId);
                toast.success("🧹 Carrito limpiado con éxito.", {
                  containerId: "carrito-toast",
                });
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded transition"
            >
              Sí
            </button>
            <button
              onClick={() => toast.dismiss(toastId)}
              className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded transition"
            >
              No
            </button>
          </div>
        </div>
      ),
      { containerId: "carrito-toast", autoClose: false, closeButton: false }
    );
  };

  return (
    <div
      className={`fixed right-0 top-[4.1em] w-[20%] h-full shadow-2xl rounded-l-xl p-4 pb-20 overflow-y-auto border-l transition-colors
        ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <h2
        className={`text-2xl font-bold mb-6 text-center transition-colors ${
          dark ? "text-white" : "text-gray-800"
        }`}
      >
        🛒 Carrito de Compras
      </h2>
      <div
        className={`mt-6 border-t pt-4 text-lg font-bold transition-colors ${
          dark ? "text-white" : "text-gray-800"
        }`}
      >
        <div className="flex justify-between items-center">
          <span>Total:</span>
          <span>${calcularTotal()}</span>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-3 mb-2">
        <button
          onClick={handleConfirmarCompra}
          className="bg-green-600 hover:bg-green-500 text-white py-2 rounded shadow-md transition-all hover:scale-105"
        >
          ✅ Confirmar Compra
        </button>
        <button
          onClick={mostrarConfirmacionVaciarCarrito}
          className="bg-red-600 hover:bg-red-500 text-white py-2 rounded shadow-md transition-all hover:scale-105"
        >
          🧹 Vaciar Carrito
        </button>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {carrito.map((producto) => (
          <li
            key={producto.id_user_product}
            className={`p-3 rounded-lg transition-all duration-500 ${
              animatingItems.has(producto.id_user_product)
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-[-10px]"
            }`}
            style={{
              backgroundColor: dark
                ? `${producto.color}33`
                : `${producto.color}22`,
            }}
          >
            <div className="mb-2">
              <h3
                className={`text-lg font-semibold ${
                  dark ? "text-white" : "text-gray-800"
                }`}
              >
                {producto.products_base.name}
              </h3>
              <p
                className={`text-sm ${
                  dark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Precio: <strong>${producto.precio_venta}</strong>
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  className={`w-8 h-8 text-lg font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    dark
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-100 hover:bg-gray-300"
                  }`}
                  onClick={() =>
                    actualizarCantidad(producto.id, producto.cantidad - 1)
                  }
                  disabled={producto.cantidad <= 1}
                >
                  −
                </button>

                <span
                  className={`text-lg font-medium ${
                    dark ? "text-white" : "text-gray-800"
                  }`}
                >
                  {producto.cantidad}
                </span>

                <button
                  className={`w-8 h-8 text-lg font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    dark
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-100 hover:bg-gray-300"
                  }`}
                  onClick={() => {
                    if (producto.cantidad < producto.stock) {
                      actualizarCantidad(producto.id, producto.cantidad + 1);
                    } else {
                      toast.warning("⚠️ Stock insuficiente.", {
                        containerId: "carrito-toast",
                      });
                    }
                  }}
                >
                  +
                </button>
              </div>

              <button
                className="text-white bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 px-3 py-1 rounded transition"
                onClick={() => eliminarProductoCarrito(producto.id)}
              >
                ✘
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ToastContainer
        containerId="carrito-toast"
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme={dark ? "dark" : "light"}
        toastClassName="rounded-md shadow-lg text-white"
        bodyClassName="text-md font-semibold"
        style={{ top: "4.5rem", right: "1rem", zIndex: 9999 }}
      />
    </div>
  );
}
