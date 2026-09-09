import { useState, useEffect, useMemo, Fragment } from "react";
// motion se usa en JSX (<motion.div> x6) pero sin jsx-uses-vars el
// linter no ve referencias JSX y lo marca "unused". NO BORRAR.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { supabase } from "../../services/supabaseClient";
import { usePedidos } from "../../hooksSB/usePedidos";
import { useAppContext } from "../../contexto/Context";
import { useAuth } from "../../contexto/AuthContext";

const publicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
};

const formatoMoneda = (num) =>
  Number(num).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatoFecha = (fecha) =>
  new Date(fecha).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const badgeEstado = (estado, dark) => {
  const styles = {
    pendiente: dark
      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
      : "bg-yellow-100 text-yellow-700 border-yellow-300",
    confirmado: dark
      ? "bg-green-500/20 text-green-300 border-green-500/40"
      : "bg-green-100 text-green-700 border-green-300",
    cancelado: dark
      ? "bg-red-500/20 text-red-300 border-red-500/40"
      : "bg-red-100 text-red-700 border-red-300",
  };
  return styles[estado] || (dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600");
};

const badgeMetodoPago = (metodo, dark) => {
  if (metodo === "transferencia") {
    return dark
      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
      : "bg-purple-100 text-purple-700 border-purple-300";
  }
  return dark
    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
    : "bg-blue-100 text-blue-700 border-blue-300";
};

const labelMetodoPago = (metodo) =>
  metodo === "transferencia" ? "Transferencia" : "Efectivo";

// Label de fecha para separadores entre días
const hoyRef = new Date();
const ayerRef = new Date(hoyRef);
ayerRef.setDate(ayerRef.getDate() - 1);

const labelFechaSeparador = (fecha) => {
  const str = fecha.toDateString();
  if (str === hoyRef.toDateString()) return "Hoy";
  if (str === ayerRef.toDateString()) return "Ayer";
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
};

// Franja lateral de la card según estado
const franjaEstado = {
  pendiente: "bg-yellow-400",
  confirmado: "bg-emerald-500",
  cancelado: "bg-red-500",
};

const iconoEstado = (estado) => {
  switch (estado) {
    case "pendiente": return "⏳";
    case "confirmado": return "✅";
    case "cancelado": return "❌";
    default: return "📦";
  }
};

// WhatsApp requiere dígitos con código de país (AR: 549 + área + número).
// Heurística: si ya empieza con 54 va como viene; si tiene 10 dígitos
// asumimos móvil AR sin código y le agregamos 549.
const armarTelefonoWhatsapp = (telefono) => {
  const digitos = String(telefono || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("54")) return digitos;
  if (digitos.length === 10) return `549${digitos}`;
  return digitos;
};

const mensajePedidoCliente = (pedido, nombreEmpresa) => {
  const cliente = pedido.cliente || {};
  const items = pedido.items || [];
  const empresa = nombreEmpresa || "nuestro negocio";
  const saludo = cliente.nombre ? `¡Hola ${cliente.nombre}! 👋` : "¡Hola! 👋";
  const novedad =
    pedido.estado === "confirmado"
      ? "Tu pedido fue confirmado ✅"
      : "Recibimos tu pedido ✅";

  const lineas = [
    saludo,
    "",
    novedad,
    `Gracias por comprar en ${empresa}. Aquí tenés el resumen:`,
    "",
    `📦 Pedido #${String(pedido.id).split("-")[0]}`,
    "",
  ];

  items.forEach((item) => {
    const precio = formatoMoneda(item.precio_unitario * item.cantidad);
    lineas.push(`• ${item.nombre}${item.talle ? ` (${item.talle})` : ""} x${item.cantidad} — $${precio}`);
  });

  lineas.push(
    "",
    `💰 Total: $${formatoMoneda(pedido.subtotal)}`,
    `💳 Forma de pago: ${labelMetodoPago(pedido.metodo_pago)}`,
    "",
    "¡Gracias por tu compra! 🙌"
  );

  return lineas.join("\n");
};

const linkWhatsappPedido = (pedido, mensaje) => {
  const tel = armarTelefonoWhatsapp(pedido.cliente?.telefono);
  if (!tel) return null;
  const msg = mensaje || mensajePedidoCliente(pedido);
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
};

const linkEmailPedido = (pedido, mensaje) => {
  const email = pedido.cliente?.email;
  if (!email) return null;
  const msg = mensaje || mensajePedidoCliente(pedido);
  return `mailto:${email}?subject=${encodeURIComponent("Actualización de tu pedido")}&body=${encodeURIComponent(msg)}`;
};

// En desktop el mailto depende de una app del SO asociada que casi
// nunca está: abre el cuadro de error "no hay aplicación" y nada más.
// Comportamiento desktop: redacción de Gmail web en pestaña nueva
// (Para/Asunto/Cuerpo cargados) + copia al portapapeles de respaldo.
// En móvil (puntero táctil) el mailto nativo funciona perfecto.
const ES_PUNTERO_TACTIL =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

const abrirEmailDesktop = (evento, pedido, mensaje) => {
  if (ES_PUNTERO_TACTIL) return;
  evento.preventDefault();
  const email = pedido.cliente?.email || "";
  const msg = mensaje || mensajePedidoCliente(pedido);
  const urlGmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent("Actualización de tu pedido")}&body=${encodeURIComponent(msg)}`;
  window.open(urlGmail, "_blank", "noopener,noreferrer");
  toast.info("📧 Se abrió Gmail en una pestaña nueva");
  navigator.clipboard
    ?.writeText(`${email}\n\n${msg}`)
    .catch(() => {});
};

function ModalConfirmacion({ open, titulo, mensaje, onConfirmar, onCancelar, dark, loading }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onCancelar}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 ${
            dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h3 className={`text-lg font-bold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
            {titulo}
          </h3>
          <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {mensaje}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancelar}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                dark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              } bg-green-600 hover:bg-green-500`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : (
                "Confirmar"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* -------------------------------------------------------
   PANEL LATERAL — slide desde la derecha
   full-screen en mobile, aside en desktop
   ------------------------------------------------------- */
function PedidoDetallePanel({ pedido, dark, onConfirmar, onCancelar, procesando, onClose }) {
  const { profile } = useAppContext();
  const [slideIn, setSlideIn] = useState(false);
  const [editoresAbiertos, setEditoresAbiertos] = useState({ whatsapp: false, email: false });
  const [mensajesEditados, setMensajesEditados] = useState({ whatsapp: "", email: "" });

  const nombreEmpresa = profile?.name || "nuestro negocio";

  useEffect(() => {
    if (!pedido) return;
    setSlideIn(false);
    const msg = mensajePedidoCliente(pedido, nombreEmpresa);
    setMensajesEditados({ whatsapp: msg, email: msg });
    setEditoresAbiertos({ whatsapp: false, email: false });
    requestAnimationFrame(() => setSlideIn(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [pedido?.id, nombreEmpresa]);

  if (!pedido) return null;

  const cliente = pedido.cliente || {};
  const items = pedido.items || [];
  const esPendiente = pedido.estado === "pendiente";
  const estaProcesando = procesando === pedido.id;

  const handleClose = () => {
    setSlideIn(false);
    setTimeout(() => onClose(), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${slideIn ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full sm:w-[420px] lg:w-[460px] h-full flex flex-col
          shadow-2xl transition-transform duration-300 ease-out z-10
          ${dark ? "bg-gray-900" : "bg-white"}
          ${slideIn ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <div>
            <p className={`text-base font-bold ${dark ? "text-white" : "text-gray-900"}`}>
              Pedido de {cliente.nombre || "Sin nombre"}
            </p>
            <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {formatoFecha(pedido.created_at)}
            </p>
          </div>
          <button
            onClick={handleClose}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              dark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-400"
            }`}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeEstado(pedido.estado, dark)}`}>
              {iconoEstado(pedido.estado)} {pedido.estado}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeMetodoPago(pedido.metodo_pago, dark)}`}>
              {labelMetodoPago(pedido.metodo_pago)}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${dark ? "text-green-400" : "text-green-600"}`}>
              ${formatoMoneda(pedido.subtotal)}
            </span>
          </div>

          {/* Datos del cliente */}
          {(cliente.telefono || cliente.email || cliente.direccion || cliente.notas) && (
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                Datos del cliente
              </h4>
              <div className={`p-3 rounded-xl space-y-2 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                {cliente.nombre && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👤</span>
                    <span className={`text-sm font-semibold ${dark ? "text-gray-200" : "text-gray-700"}`}>{cliente.nombre}</span>
                  </div>
                )}
                {cliente.telefono && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📱</span>
                    <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{cliente.telefono}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✉️</span>
                    <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{cliente.email}</span>
                  </div>
                )}
                {cliente.direccion && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📍</span>
                    <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{cliente.direccion}</span>
                  </div>
                )}
                {cliente.notas && (
                  <div className={`flex items-start gap-2 pt-2 border-t ${dark ? "border-gray-700" : "border-gray-200"}`}>
                    <span className="text-sm shrink-0">📝</span>
                    <p className={`text-sm italic ${dark ? "text-gray-400" : "text-gray-500"}`}>{cliente.notas}</p>
                  </div>
                )}

                {/* Confirmar al cliente por WhatsApp / email */}
                {(cliente.telefono || cliente.email) && (
                  <div className="pt-2 space-y-3">
                    {cliente.telefono && (
                      <div className="space-y-1">
                        <a
                          href={linkWhatsappPedido(pedido, mensajesEditados.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir WhatsApp con el mensaje pre-cargado"
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:brightness-110 active:scale-[0.97] transition-all"
                        >
                          <span className="text-base">💬</span>
                          Confirmar por WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() => setEditoresAbiertos((p) => ({ ...p, whatsapp: !p.whatsapp }))}
                          className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            dark
                              ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {editoresAbiertos.whatsapp ? "Ocultar mensaje" : "Editar mensaje"}
                        </button>
                        {editoresAbiertos.whatsapp && (
                          <textarea
                            rows={8}
                            value={mensajesEditados.whatsapp}
                            onChange={(e) => setMensajesEditados((p) => ({ ...p, whatsapp: e.target.value }))}
                            className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono resize-y min-h-[120px] transition-colors ${
                              dark
                                ? "bg-gray-900 border-gray-600 text-gray-200 focus:border-green-500"
                                : "bg-white border-gray-300 text-gray-800 focus:border-green-500"
                            } focus:outline-none focus:ring-1 focus:ring-green-500/30`}
                          />
                        )}
                      </div>
                    )}
                    {cliente.email && (
                      <div className="space-y-1">
                        <a
                          href={linkEmailPedido(pedido, mensajesEditados.email)}
                          onClick={(ev) => abrirEmailDesktop(ev, pedido, mensajesEditados.email)}
                          title="Abrir tu cliente de correo con el mensaje pre-cargado"
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.97] transition-all"
                        >
                          <span className="text-base">✉️</span>
                          Confirmar por email
                        </a>
                        <button
                          type="button"
                          onClick={() => setEditoresAbiertos((p) => ({ ...p, email: !p.email }))}
                          className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            dark
                              ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {editoresAbiertos.email ? "Ocultar mensaje" : "Editar mensaje"}
                        </button>
                        {editoresAbiertos.email && (
                          <textarea
                            rows={8}
                            value={mensajesEditados.email}
                            onChange={(e) => setMensajesEditados((p) => ({ ...p, email: e.target.value }))}
                            className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono resize-y min-h-[120px] transition-colors ${
                              dark
                                ? "bg-gray-900 border-gray-600 text-gray-200 focus:border-blue-500"
                                : "bg-white border-gray-300 text-gray-800 focus:border-blue-500"
                            } focus:outline-none focus:ring-1 focus:ring-blue-500/30`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Productos */}
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Productos ({items.length})
            </h4>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const img = publicUrl(item.imagen);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-50"}`}
                  >
                    <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                      {img ? (
                        <img src={img} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold block truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>
                        {item.nombre}
                      </span>
                      {item.marca && (
                        <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{item.marca}</span>
                      )}
                      {item.talle && (
                        <span className={`inline-block mt-0.5 rounded px-1 py-px text-[10px] font-semibold ${dark ? "bg-gray-700 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                          Talle {item.talle}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>x{item.cantidad}</span>
                      <span className={`text-sm font-bold block ${dark ? "text-green-400" : "text-green-600"}`}>
                        ${formatoMoneda(item.precio_unitario * item.cantidad)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <span className={`text-[10px] font-mono block ${dark ? "text-gray-600" : "text-gray-400"}`}>
            ID: {pedido.id.slice(0, 8)}...
          </span>
        </div>

        {/* Footer acciones */}
        {esPendiente && (
          <div className={`px-5 py-4 border-t shrink-0 ${dark ? "border-gray-700" : "border-gray-200"}`}>
            <div className="flex gap-3">
              <button
                onClick={() => { handleClose(); setTimeout(() => onConfirmar(pedido), 350); }}
                disabled={estaProcesando}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all ${
                  estaProcesando
                    ? "opacity-50 cursor-not-allowed bg-green-700"
                    : "bg-green-600 hover:bg-green-500 active:scale-[0.98]"
                }`}
              >
                {estaProcesando ? "Procesando..." : "✅ Confirmar y crear venta"}
              </button>
              <button
                onClick={() => { handleClose(); setTimeout(() => onCancelar(pedido), 350); }}
                disabled={estaProcesando}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                  estaProcesando
                    ? "opacity-50 cursor-not-allowed"
                    : dark
                    ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                    : "border-red-300 text-red-600 hover:bg-red-50"
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PedidosWeb() {
  const { preferencias, registrarVentaLocal, products, actualizarProductosPostVenta } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const { user } = useAuth();
  const {
    pedidos,
    pedidosFiltrados,
    loading,
    error,
    filtroEstado,
    setFiltroEstado,
    contadores,
    procesando,
    confirmarPedido,
    cancelarPedido,
    hasMore,
    loadMore,
  } = usePedidos({ userId: user?.id });

  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [modal, setModal] = useState({ open: false, tipo: null, pedido: null });
  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Contadores de método de pago independientes del filtro de estado
  const contadoresMetodo = useMemo(() => ({
    todos: pedidos.length,
    tienda: pedidos.filter((p) => p.metodo_pago === "tienda").length,
    transferencia: pedidos.filter((p) => p.metodo_pago === "transferencia").length,
  }), [pedidos]);

  // Lista final: filtro de estado + método + búsqueda por código
  const pedidosFinales = useMemo(() => {
    let base = pedidosFiltrados;
    if (filtroMetodo !== "todos") {
      base = base.filter((p) => p.metodo_pago === filtroMetodo);
    }
    const q = busqueda.trim().toLowerCase();
    if (q) {
      base = base.filter((p) => String(p.id).split("-")[0].toLowerCase().startsWith(q));
    }
    return base;
  }, [pedidosFiltrados, filtroMetodo, busqueda]);

  const filtros = [
    { id: "todos", label: "Todos", count: contadores.todos },
    { id: "pendiente", label: "Pendientes", count: contadores.pendientes },
    { id: "confirmado", label: "Confirmados", count: contadores.confirmados },
    { id: "cancelado", label: "Cancelados", count: contadores.cancelados },
  ];

  const filtrosMetodo = [
    { id: "todos", label: "Todos", count: contadoresMetodo.todos },
    { id: "tienda", label: "Efectivo", count: contadoresMetodo.tienda },
    { id: "transferencia", label: "Transferencia", count: contadoresMetodo.transferencia },
  ];

  const handleConfirmar = async () => {
    const { pedido } = modal;
    setModal({ open: false, tipo: null, pedido: null });
    const result = await confirmarPedido(pedido);
    if (result.success) {
      registrarVentaLocal(result.venta, result.detalles);

      const productosActualizados = (pedido.items || []).map((item) => {
        const prod = products.find((p) => p.id === item.producto_id);
        return {
          id_producto: item.producto_id,
          stock: Number(prod?.stock || 0) - Number(item.cantidad),
          talle: item.talle || null,
          cantidad: item.cantidad,
        };
      });
      actualizarProductosPostVenta(productosActualizados);

      // user_sales.id es bigint (no uuid): se muestra entero, sin slice()
      toast.success(`Pedido confirmado. Venta #${result?.venta?.id ?? "?"} creada`);
    } else {
      toast.error(result.error);
    }
  };

  const handleCancelar = async () => {
    const { pedido } = modal;
    setModal({ open: false, tipo: null, pedido: null });
    const result = await cancelarPedido(pedido);
    if (result.success) {
      toast.success("Pedido cancelado");
    } else {
      toast.error(result.error);
    }
  };

  const abrirModalConfirmar = (pedido) => {
    setPedidoActivo(null);
    setTimeout(() => setModal({ open: true, tipo: "confirmar", pedido }), 350);
  };

  const abrirModalCancelar = (pedido) => {
    setPedidoActivo(null);
    setTimeout(() => setModal({ open: true, tipo: "cancelar", pedido }), 350);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Cargando pedidos...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className={`p-6 rounded-xl border ${dark ? "bg-gray-800 border-red-500/30" : "bg-white border-red-200"}`}>
          <p className="text-red-500 text-center">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-900"} px-3 py-4 md:p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={`font-bold text-xl md:text-3xl ${dark ? "text-blue-400" : "text-blue-600"}`}>
          Pedidos Web
        </h1>
        <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {pedidosFinales.length} pedido{pedidosFinales.length !== 1 && "s"}
        </span>
      </div>

      {/* Filtros por estado */}
      <div className="mb-2">
        <span className={`text-[10px] uppercase tracking-wider font-medium mb-1 block ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Estado
        </span>
        <div className="flex flex-wrap gap-1.5">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroEstado(f.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1 ${
                filtroEstado === f.id
                  ? f.id === "pendiente"
                    ? "bg-yellow-500 text-white border-yellow-400"
                    : f.id === "confirmado"
                    ? "bg-green-500 text-white border-green-400"
                    : f.id === "cancelado"
                    ? "bg-red-500 text-white border-red-400"
                    : "bg-blue-500 text-white border-blue-400"
                  : dark
                  ? "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {f.label}
              <span
                className={`px-1 py-0.5 rounded-full text-[10px] leading-none ${
                  filtroEstado === f.id
                    ? "bg-white/20"
                    : dark
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros por método de pago */}
      <div className="mb-5">
        <span className={`text-[10px] uppercase tracking-wider font-medium mb-1 block ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Pago
        </span>
        <div className="flex flex-wrap gap-1.5">
          {filtrosMetodo.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroMetodo(f.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1 ${
                filtroMetodo === f.id
                  ? f.id === "tienda"
                    ? "bg-amber-500 text-white border-amber-400"
                    : f.id === "transferencia"
                    ? "bg-purple-500 text-white border-purple-400"
                    : "bg-blue-500 text-white border-blue-400"
                  : dark
                  ? "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {f.label}
              <span
                className={`px-1 py-0.5 rounded-full text-[10px] leading-none ${
                  filtroMetodo === f.id
                    ? "bg-white/20"
                    : dark
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Búsqueda por código */}
      <div className="mb-4">
        <div className={`relative flex items-center rounded-lg border overflow-hidden transition-colors ${
          dark ? "bg-gray-800 border-gray-700 focus-within:border-gray-600" : "bg-white border-gray-200 focus-within:border-gray-300"
        }`}>
          <span className={`pl-2.5 text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código de pedido..."
            className={`w-full py-1.5 px-2 text-xs outline-none bg-transparent ${
              dark ? "text-gray-200 placeholder:text-gray-600" : "text-gray-800 placeholder:text-gray-400"
            }`}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className={`pr-2.5 text-sm ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lista de pedidos */}
      {pedidosFinales.length === 0 ? (
        <div className={`p-12 rounded-xl border text-center ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <span className="text-4xl block mb-3">📭</span>
          <p className={`text-lg font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>
            No hay pedidos{(filtroEstado !== "todos" || filtroMetodo !== "todos" || busqueda) ? " con estos filtros" : ""}
          </p>
          <p className={`text-sm mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Los pedidos del store online aparecerán acá
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFinales.map((pedido, index) => {
            const cliente = pedido.cliente || {};
            const items = pedido.items || [];
            const cantidadItems = items.reduce((acc, item) => acc + (item.cantidad || 0), 0);
            const estaProcesando = procesando === pedido.id;
            const fechaPedido = new Date(pedido.created_at);

            // Detectar cambio de día para separador
            const prevPedido = pedidosFinales[index - 1];
            const fechaActual = fechaPedido.toDateString();
            const fechaAnterior = prevPedido ? new Date(prevPedido.created_at).toDateString() : null;
            const nuevoDia = fechaActual !== fechaAnterior;

            return (
              <Fragment key={pedido.id}>
                {nuevoDia && (
                  <div className="relative flex items-center py-1 my-1">
                    <div className={`flex-grow border-t ${dark ? "border-gray-700/60" : "border-gray-200"}`} />
                    <span className={`mx-3 text-xs font-semibold tracking-wide whitespace-nowrap ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      📅 {labelFechaSeparador(fechaPedido)}
                    </span>
                    <div className={`flex-grow border-t ${dark ? "border-gray-700/60" : "border-gray-200"}`} />
                  </div>
                )}
                <motion.div
                  layout
                  className={`relative rounded-2xl border overflow-hidden transition-colors cursor-pointer shadow-sm dark:shadow-none ${
                    dark
                      ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  } ${estaProcesando ? "opacity-60 pointer-events-none" : ""}`}
                  onClick={() => !estaProcesando && setPedidoActivo(pedido)}
                >
                  {/* Franja de estado */}
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${franjaEstado[pedido.estado] || "bg-gray-400"}`} />

                  <div className="p-3.5 pl-[18px]">
                    <div className="flex items-start justify-between gap-3">
                      {/* Izquierda: textos al margen */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-[15px] leading-snug truncate ${dark ? "text-white" : "text-gray-900"}`}>
                          {cliente.nombre || "Sin nombre"}
                        </p>
                        <span className={`inline-block font-mono text-[11px] font-semibold mt-0.5 px-1.5 py-px rounded ${
                          dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                        }`}>
                          #{String(pedido.id).split("-")[0]}
                        </span>

                        {/* Fecha y horario: chips destacados y separados */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                              dark ? "bg-gray-700/80 text-gray-100" : "bg-gray-100 text-gray-800"
                            }`}
                            title={fechaPedido.toLocaleString("es-AR")}
                          >
                            📅 {fechaPedido.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" })}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold tabular-nums ${
                              dark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            🕐 {fechaPedido.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                          {cliente.telefono && (
                            <span className={`text-[11px] ${dark ? "text-gray-400" : "text-gray-500"}`}>
                              📱 {cliente.telefono}
                            </span>
                          )}
                          <span className={`text-[11px] ${dark ? "text-gray-400" : "text-gray-500"}`}>
                            📦 {cantidadItems} producto{cantidadItems !== 1 && "s"}
                          </span>
                        </div>
                      </div>

                      {/* Derecha: apilado vertical */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className={`font-extrabold text-lg leading-none tabular-nums tracking-tight ${dark ? "text-green-400" : "text-green-600"}`}>
                          ${formatoMoneda(pedido.subtotal)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeEstado(pedido.estado, dark)}`}>
                          {iconoEstado(pedido.estado)} {pedido.estado}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeMetodoPago(pedido.metodo_pago, dark)}`}>
                          {labelMetodoPago(pedido.metodo_pago)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Fragment>
            );
          })}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className={`w-full py-2 rounded-xl text-sm font-medium border transition-all mt-1 ${
                loading
                  ? "opacity-50 cursor-not-allowed "
                  : ""
              }${
                dark
                  ? "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {loading ? "Cargando..." : "Ver más pedidos"}
            </button>
          )}
        </div>
      )}

      {/* Panel lateral de detalle */}
      <PedidoDetallePanel
        pedido={pedidoActivo}
        dark={dark}
        onConfirmar={abrirModalConfirmar}
        onCancelar={abrirModalCancelar}
        procesando={procesando}
        onClose={() => setPedidoActivo(null)}
      />

      {/* Modal de confirmación */}
      <ModalConfirmacion
        open={modal.open}
        titulo={modal.tipo === "confirmar" ? "Confirmar pedido" : "Cancelar pedido"}
        mensaje={
          modal.tipo === "confirmar"
            ? `Se creará una venta de $${formatoMoneda(modal.pedido?.subtotal || 0)} y se descontará el stock. ¿Continuar?`
            : `¿Cancelar el pedido de ${modal.pedido?.cliente?.nombre || "este cliente"}? Esta acción no se puede deshacer.`
        }
        onConfirmar={modal.tipo === "confirmar" ? handleConfirmar : handleCancelar}
        onCancelar={() => setModal({ open: false, tipo: null, pedido: null })}
        dark={dark}
        loading={procesando === modal.pedido?.id}
      />
    </div>
  );
}
