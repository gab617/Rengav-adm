import React, { useState, useEffect } from "react";
import { useAppContext } from "../../contexto/Context";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { stockDelTalle } from "../../utils/talles";

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
  const [loading, setLoading] = useState(false);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteData, setClienteData] = useState({
    cliente_nombre: "",
    cliente_telefono: "",
    cliente_email: "",
    metodo_pago: "efectivo",
    estado: "confirmado",
  });

  useEffect(() => {
    const newSet = new Set(
      carrito.map((p) => `${p.id}|${p.talle || ""}`)
    );
    setAnimatingItems(newSet);
  }, [carrito]);

  const handleConfirmarCompra = async () => {
    if (carrito.length === 0 || loading) return;

    setLoading(true);

    const metadata = {
      cliente_nombre: clienteData.cliente_nombre.trim() || null,
      cliente_telefono: clienteData.cliente_telefono.trim() || null,
      cliente_email: clienteData.cliente_email.trim() || null,
      metodo_pago: clienteData.metodo_pago,
      estado: clienteData.estado,
    };

    const ventaExitosa = await crearVenta(
      carrito,
      actualizarProductosPostVenta,
      metadata,
    );

    setLoading(false);

    if (ventaExitosa) {
      toast.success("✅ Venta realizada con éxito.", {
        containerId: "carrito-toast",
      });
      limpiarCarrito();
      setClienteData({
        cliente_nombre: "",
        cliente_telefono: "",
        cliente_email: "",
        metodo_pago: "efectivo",
        estado: "confirmado",
      });
      setShowClienteForm(false);
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
      { containerId: "carrito-toast", autoClose: false, closeButton: false },
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

      {/* MÉTODO DE PAGO + ESTADO — siempre visibles */}
      <div className={`mt-3 border-t pt-3`}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={`block text-[10px] font-medium mb-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Método de pago
            </label>
            <select
              value={clienteData.metodo_pago}
              onChange={(e) => setClienteData({ ...clienteData, metodo_pago: e.target.value })}
              className={`w-full px-2 py-1.5 rounded-lg border text-sm font-medium ${
                dark ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300"
              }`}
            >
                <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <div className="flex-1">
            <label className={`block text-[10px] font-medium mb-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Estado
            </label>
            <select
              value={clienteData.estado}
              onChange={(e) => setClienteData({ ...clienteData, estado: e.target.value })}
              className={`w-full px-2 py-1.5 rounded-lg border text-sm font-medium ${
                dark ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300"
              }`}
            >
              <option value="confirmado">✅ Confirmado</option>
              <option value="pendiente">⏳ Pendiente</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATOS DEL CLIENTE (colapsable) */}
      <div className="mt-3">
        <button
          onClick={() => setShowClienteForm(!showClienteForm)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            dark
              ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <span>Datos del cliente (opcional)</span>
          <span>{showClienteForm ? "▲" : "▼"}</span>
        </button>

        {showClienteForm && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={clienteData.cliente_nombre}
              onChange={(e) => setClienteData({ ...clienteData, cliente_nombre: e.target.value })}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                dark ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 placeholder-gray-400"
              }`}
            />
            <input
              type="tel"
              placeholder="Teléfono (opcional)"
              value={clienteData.cliente_telefono}
              onChange={(e) => setClienteData({ ...clienteData, cliente_telefono: e.target.value })}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                dark ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 placeholder-gray-400"
              }`}
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              value={clienteData.cliente_email}
              onChange={(e) => setClienteData({ ...clienteData, cliente_email: e.target.value })}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                dark ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 placeholder-gray-400"
              }`}
            />
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-3 mb-2">
        <button
          onClick={handleConfirmarCompra}
          disabled={loading || carrito.length === 0}
          className={`bg-green-600 text-white py-2 rounded shadow-md transition-all
            ${loading ? "opacity-70 cursor-wait" : "hover:bg-green-500 hover:scale-105"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </span>
          ) : (
            "✅ Confirmar Compra"
          )}
        </button>
        <button
          onClick={mostrarConfirmacionVaciarCarrito}
          disabled={loading}
          className="bg-red-600 hover:bg-red-500 text-white py-2 rounded shadow-md transition-all hover:scale-105 disabled:opacity-50"
        >
          🧹 Vaciar Carrito
        </button>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {carrito.map((producto) => {
          const esPeso = producto.products_base?.type_unit === "weight";
          const totalItem = producto.cantidad * producto.precio_venta;
          const stockTalle = stockDelTalle(producto, producto.talle);

          return (
            <li
              key={`${producto.id}|${producto.talle || ""}`}
              className={`p-3 rounded-lg transition-all duration-500 ${
                animatingItems.has(`${producto.id}|${producto.talle || ""}`)
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
                  {producto.talle && (
                    <span
                      className={`ml-2 text-sm font-bold px-2 py-0.5 rounded-full ${
                        dark
                          ? "bg-white/10 text-gray-200"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      👕 {producto.talle}
                    </span>
                  )}
                </h3>

                {esPeso ? (
                  <p
                    className={`text-sm ${
                      dark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Peso:{" "}
                    <strong>{Number(producto.cantidad).toFixed(3)} kg</strong>
                    {" • "}
                    Precio/kg: <strong>${producto.precio_venta}</strong>
                    {" • "}<br/>
                    Total: <strong>${totalItem.toFixed(2)}</strong>
                  </p>
                ) : (
                  <p
                    className={`text-sm ${
                      dark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Precio: <strong>${producto.precio_venta}</strong>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                {!esPeso && (
                  <div className="flex items-center gap-2">
                    <button
                      className={`w-8 h-8 text-lg font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        dark
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-100 hover:bg-gray-300"
                      }`}
                      onClick={() =>
                        actualizarCantidad(
                          producto.id,
                          producto.cantidad - 1,
                          producto.talle,
                        )
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
                        if (producto.cantidad < stockTalle) {
                          actualizarCantidad(
                            producto.id,
                            producto.cantidad + 1,
                            producto.talle,
                          );
                        } else {
                          toast.warning(
                            producto.talle
                              ? `⚠️ Stock insuficiente para el talle ${producto.talle}.`
                              : "⚠️ Stock insuficiente.",
                            {
                              containerId: "carrito-toast",
                            },
                          );
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  className="text-white bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 px-3 py-1 rounded transition"
                  onClick={() =>
                    eliminarProductoCarrito(producto.id, producto.talle)
                  }
                >
                  ✘
                </button>
              </div>
            </li>
          );
        })}
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
