import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../contexto/Context";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { stockDelTalle } from "../../utils/talles";

export function CarritoMobile({ onClose }) {
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

  const [animatingItems] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteData, setClienteData] = useState({
    cliente_nombre: "",
    cliente_telefono: "",
    cliente_email: "",
    metodo_pago: "efectivo",
    estado: "confirmado",
  });

  const stopProp = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

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
      toast.success("✅ Venta realizada con éxito.");
      limpiarCarrito();
      setClienteData({
        cliente_nombre: "",
        cliente_telefono: "",
        cliente_email: "",
        metodo_pago: "efectivo",
        estado: "confirmado",
      });
      setShowClienteForm(false);
      if (onClose) onClose();
    } else {
      toast.error("❌ Hubo un error al procesar la venta.");
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
                toast.success("🧹 Carrito limpiado con éxito.");
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
      { autoClose: false, closeButton: false },
    );
  };

  const totalFormateado = calcularTotal()
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const esPeso = (producto) => producto.products_base?.type_unit === "weight";

  const cantidadEnCarrito = (producto) => {
    const items = carrito.filter((item) => item.id === producto.id);
    if (items.length === 0) return 0;
    if (esPeso(producto)) {
      return items.reduce((acc, item) => acc + Number(item.cantidad), 0);
    }
    return items.reduce((acc, item) => acc + item.cantidad, 0);
  };

  return (
    <div className="p-4 pb-24" onClick={(e) => e.stopPropagation()}>
      {/* HEADER RESUMEN */}
      <div className={`
        mb-4 p-4 rounded-xl
        ${dark ? "bg-gradient-to-r from-green-900/50 to-green-800/50" : "bg-gradient-to-r from-green-100 to-green-50"}
      `}>
        <div className="flex justify-between items-center">
          <span className={`font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>
            Total:
          </span>
          <span className={`text-2xl font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
            ${totalFormateado}
          </span>
        </div>
      </div>

      {/* MÉTODO DE PAGO + ESTADO — siempre visibles */}
      <div className="mb-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={`block text-[10px] font-medium mb-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Método de pago
            </label>
            <select
              value={clienteData.metodo_pago}
              onChange={(e) => setClienteData({ ...clienteData, metodo_pago: e.target.value })}
              className={`w-full px-2 py-2 rounded-xl border text-sm font-medium ${
                dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
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
              className={`w-full px-2 py-2 rounded-xl border text-sm font-medium ${
                dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
              }`}
            >
              <option value="confirmado">✅ Confirmado</option>
              <option value="pendiente">⏳ Pendiente</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATOS DEL CLIENTE (colapsable) */}
      <div className="mb-3">
        <button
          onClick={(e) => { e.stopPropagation(); setShowClienteForm(!showClienteForm); }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <span>Datos del cliente (opcional)</span>
          <span>{showClienteForm ? "▲" : "▼"}</span>
        </button>

        {showClienteForm && (
          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={clienteData.cliente_nombre}
              onChange={(e) => setClienteData({ ...clienteData, cliente_nombre: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-sm ${
                dark ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 placeholder-gray-400"
              }`}
            />
            <input
              type="tel"
              placeholder="Teléfono (opcional)"
              value={clienteData.cliente_telefono}
              onChange={(e) => setClienteData({ ...clienteData, cliente_telefono: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-sm ${
                dark ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 placeholder-gray-400"
              }`}
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              value={clienteData.cliente_email}
              onChange={(e) => setClienteData({ ...clienteData, cliente_email: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-sm ${
                dark ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 placeholder-gray-400"
              }`}
            />
          </div>
        )}
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleConfirmarCompra();
          }}
          disabled={loading || carrito.length === 0}
          className={`
            flex-1 py-3 rounded-xl font-bold
            transition-all
            disabled:opacity-70 disabled:cursor-wait
            ${loading
              ? "bg-green-700 text-white"
              : dark
                ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30"
                : "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200"
            }
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
            "✅ Confirmar Venta"
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            mostrarConfirmacionVaciarCarrito();
          }}
          className={`
            px-4 py-3 rounded-xl
            transition-all hover:scale-[1.02]
            ${dark
              ? "bg-red-600/80 hover:bg-red-600 text-white"
              : "bg-red-100 hover:bg-red-200 text-red-700"
            }
          `}
        >
          🗑️
        </button>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <ul className="space-y-3">
        {carrito.map((producto) => {
          const totalItem = producto.cantidad * producto.precio_venta;
          const totalItemFormateado = totalItem
            .toFixed(2)
            .replace(/\.00$/, "")
            .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          const cantidad = cantidadEnCarrito(producto);
          const esP = esPeso(producto);
          const stockTalle = stockDelTalle(producto, producto.talle);

          return (
            <li
              key={`${producto.id}|${producto.talle || ""}`}
              className={`
                p-4 rounded-xl border-2
                transition-all duration-200
                ${dark
                  ? "bg-gray-700/50 border-gray-600"
                  : "bg-gray-50 border-gray-200"
                }
              `}
              style={{
                backgroundColor: producto.color
                  ? `${producto.color}22`
                  : undefined,
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>
                    {producto.products_base?.name}
                    {producto.talle && (
                      <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                        dark ? "bg-white/10 text-gray-200" : "bg-gray-200 text-gray-700"
                      }`}>
                        👕 {producto.talle}
                      </span>
                    )}
                  </h3>
                  <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    {esP ? (
                      <>
                        <span className="font-medium">{Number(producto.cantidad).toFixed(3)} kg</span>
                        <span className="mx-1">×</span>
                        <span>${producto.precio_venta}/kg</span>
                      </>
                    ) : (
                      <span className="font-medium">${producto.precio_venta}</span>
                    )}
                  </p>
                </div>
                <span className={`
                  font-bold text-lg ml-2
                  ${dark ? "text-green-400" : "text-green-700"}
                `}>
                  ${totalItemFormateado}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                {!esP && (
                  <div className={`
                    flex items-center gap-2 rounded-lg
                    ${dark ? "bg-gray-600" : "bg-gray-200"}
                  `}>
                    <button
                      className={`
                        w-9 h-9 flex items-center justify-center
                        font-bold text-lg rounded-lg
                        transition-colors
                        ${dark
                          ? "hover:bg-gray-500 text-white"
                          : "hover:bg-gray-300 text-gray-700"
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        actualizarCantidad(
                          producto.id,
                          producto.cantidad - 1,
                          producto.talle,
                        );
                      }}
                      disabled={producto.cantidad <= 1}
                    >
                      −
                    </button>

                    <span className={`w-8 text-center font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                      {producto.cantidad}
                    </span>

                    <button
                      className={`
                        w-9 h-9 flex items-center justify-center
                        font-bold text-lg rounded-lg
                        transition-colors
                        ${dark
                          ? "hover:bg-gray-500 text-white"
                          : "hover:bg-gray-300 text-gray-700"
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
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
                          );
                        }
                      }}
                    >
                      +
                    </button>
                </div>)}

                {esP && (
                  <div className={`
                    px-3 py-1 rounded-lg text-sm font-medium
                    ${dark ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"}
                  `}>
                    {Number(producto.cantidad).toFixed(3)} kg
                  </div>
                )}

                <button
                  className={`
                    px-3 py-2 rounded-lg
                    transition-colors
                    ${dark
                      ? "bg-red-600/80 hover:bg-red-600 text-white"
                      : "bg-red-100 hover:bg-red-200 text-red-600"
                    }
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarProductoCarrito(producto.id, producto.talle);
                  }}
                >
                  🗑️
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {carrito.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛒</div>
          <p className={`${dark ? "text-gray-400" : "text-gray-500"}`}>
            Tu carrito está vacío
          </p>
          <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"} mt-1`}>
            Agrega productos para comenzar
          </p>
        </div>
      )}
    </div>
  );
}
