import React, { useState, useMemo, useEffect } from "react";
import { ListPedido } from "../proveedores/components/ListPedido";
import { useAppContext } from "../../contexto/Context";
import { ListaDeProductosSolicitados } from "./ListaDeProductosSolicitados";

export default function Pedidos() {
  const { pedidos, limpiarPedidos, proveedores, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);

  const [openPanel, setOpenPanel] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [telefonoManual, setTelefonoManual] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showToast, setShowToast] = useState(null);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getPrecio = (item) => {
    return parseFloat(item.precio_compra || item.precio || item.products_base?.precio_compra || 0);
  };

  const totalEstimado = useMemo(() => {
    return pedidos
      .reduce((total, item) => total + getPrecio(item) * item.cantidad, 0);
  }, [pedidos]);

  const totalItems = useMemo(() => {
    return pedidos.reduce((acc, item) => acc + item.cantidad, 0);
  }, [pedidos]);

  const generarMensaje = () => {
    if (pedidos.length === 0) return "🛒 No hay productos en la lista.";
    let mensaje = " *Lista de Pedido* \n\n";
    pedidos.forEach((item, index) => {
      const nombre = item.products_base?.name || item.nombre || "Producto";
      mensaje += `${index + 1}. ${nombre} x${item.cantidad}\n`;
    });
    mensaje += `\n💰 Total: $${totalEstimado.toLocaleString()}`;
    return mensaje;
  };

  const mensaje = generarMensaje();

  const toast = (message, type = "success") => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 2500);
  };

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      toast("📋 Lista copiada al portapapeles");
    } catch {
      toast("Error al copiar", "error");
    }
  };

  const enviarPorWhatsApp = () => {
    let numero = "";

    if (proveedorSeleccionado) {
      const proveedor = proveedores.find(
        (p) => p.id === parseInt(proveedorSeleccionado)
      );
      if (!proveedor || !proveedor.telefono) {
        toast("⚠️ El proveedor no tiene número válido", "error");
        return;
      }
      numero = proveedor.telefono;
    } else if (telefonoManual && telefonoManual.trim() !== "") {
      numero = telefonoManual;
    } else {
      toast("⚠️ Seleccioná proveedor o ingresá teléfono", "error");
      return;
    }

    const numeroFinal = `+549${numero.replace(/\D/g, "")}`;
    const url = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const confirmarLimpiar = () => {
    if (pedidos.length === 0) return;
    if (confirm("¿Vaciar la lista de pedido?")) {
      limpiarPedidos();
      toast("🗑️ Lista vaciada");
    }
  };

  const selectedProveedor = useMemo(() => {
    if (!proveedorSeleccionado) return null;
    return proveedores.find((p) => p.id === parseInt(proveedorSeleccionado));
  }, [proveedorSeleccionado, proveedores]);

  const cardBg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const bgMain = dark ? "bg-gray-900" : "bg-gray-50";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";
  const accentColor = dark ? "text-blue-400" : "text-blue-600";

  // PANEL reutilizable
  const renderPanel = () => (
    <div className="flex flex-col h-full gap-3">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className={`font-bold ${textPrimary}`}>📝 Consola de Pedido</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs ${dark ? "bg-blue-500/30 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
          {pedidos.length} items
        </span>
      </div>

      {/* SELECTOR PROVEEDOR */}
      <div className="space-y-2">
        <select
          value={proveedorSeleccionado}
          onChange={(e) => setProveedorSeleccionado(e.target.value)}
          className={`w-full p-3 rounded-xl border ${inputBg} text-sm`}
        >
          <option value="">Seleccionar proveedor</option>
          {proveedores.map((prov) => (
            <option key={prov.id} value={prov.id}>
              {prov.nombre}
            </option>
          ))}
        </select>

        {selectedProveedor ? (
          <div className={`p-3 rounded-xl ${dark ? "bg-green-500/10 border border-green-500/30" : "bg-green-50 border border-green-200"}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📞</span>
              <span className={`font-medium ${textPrimary}`}>
                {selectedProveedor.telefono || "Sin teléfono"}
              </span>
            </div>
            {selectedProveedor.email && (
              <p className={`text-xs ${textSecondary} mt-1`}>
                ✉️ {selectedProveedor.email}
              </p>
            )}
          </div>
        ) : (
          <input
            type="tel"
            value={telefonoManual}
            onChange={(e) => setTelefonoManual(e.target.value)}
            placeholder="O ingresá teléfono..."
            className={`w-full p-3 rounded-xl border ${inputBg} text-sm`}
          />
        )}
      </div>

      {/* LISTA DE PEDIDO */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <ListaDeProductosSolicitados pedidos={pedidos} dark={dark} />
      </div>

      {/* RESUMEN */}
      <div className={`p-3 rounded-xl ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
        <div className="flex justify-between items-center">
          <span className={textSecondary}>Items:</span>
          <span className={`font-bold ${accentColor}`}>{totalItems}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className={textSecondary}>Total estimado:</span>
          <span className={`font-bold text-lg ${dark ? "text-green-400" : "text-green-600"}`}>
            ${parseInt(totalEstimado).toLocaleString()}
          </span>
        </div>
      </div>

      {/* PREVIEW */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className={`p-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          showPreview
            ? dark
              ? "bg-purple-500/20 text-purple-400"
              : "bg-purple-100 text-purple-600"
            : `${inputBg} ${textSecondary}`
        }`}
      >
        <span>{showPreview ? "🙈" : "👁️"}</span>
        <span>{showPreview ? "Ocultar" : "Ver"} mensaje</span>
      </button>

      {showPreview && (
        <div className={`p-3 rounded-xl text-xs font-mono whitespace-pre-wrap ${dark ? "bg-gray-900" : "bg-gray-50 border"} ${textSecondary}`}>
          {mensaje}
        </div>
      )}

      {/* ACCIONES */}
      <div className="space-y-2">
        <button
          onClick={copiarAlPortapapeles}
          disabled={pedidos.length === 0}
          className="w-full p-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <span>📋</span>
          <span>Copiar Lista</span>
        </button>

        <button
          onClick={enviarPorWhatsApp}
          disabled={pedidos.length === 0}
          className="w-full p-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>Enviar por WhatsApp</span>
        </button>

        <button
          onClick={confirmarLimpiar}
          disabled={pedidos.length === 0}
          className="w-full p-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          <span>🗑️</span>
          <span>Vaciar Lista</span>
        </button>
      </div>
    </div>
  );

  // TOAST
  const ToastComponent = () => {
    if (!showToast) return null;
    
    const bgColor = showToast.type === "error" 
      ? "bg-red-500" 
      : "bg-green-500";
    
    return (
      <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-xl shadow-2xl animate-slide-in`}>
        {showToast.message}
      </div>
    );
  };

  return (
    <div className={`min-h-screen w-full mx-auto flex sm:gap-4 ${bgMain} p-2 sm:p-4`}>
      <ToastComponent />

      {/* BOTÓN MOBILE */}
      {esMobile && (
        <button
          onClick={() => setOpenPanel(true)}
          className="fixed z-50 bottom-20 left-1/2 -translate-x-1/2 px-5 py-3 bg-blue-600 text-white rounded-full shadow-2xl flex items-center gap-2 font-medium"
        >
          <span>📝</span>
          <span>Pedido</span>
          {pedidos.length > 0 && (
            <span className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
              {pedidos.length}
            </span>
          )}
        </button>
      )}

      {/* LISTA */}
      <div className={`flex-1 overflow-y-auto max-h-[90vh] p-2 sm:p-4 border rounded-2xl shadow-sm ${cardBg}`}>
        <ListPedido />
      </div>

      {/* PANEL DESKTOP */}
      {!esMobile && (
        <div className={`w-80 max-h-[90vh] overflow-auto sticky top-4 rounded-2xl border ${borderColor} shadow-xl ${cardBg}`}>
          <div className="p-4">
            {renderPanel()}
          </div>
        </div>
      )}

      {/* MODAL MOBILE */}
      {esMobile && openPanel && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={(e) => e.target === e.currentTarget && setOpenPanel(false)}
        >
          <div 
            className={`w-full max-h-[85vh] rounded-t-3xl shadow-2xl overflow-hidden ${cardBg} animate-slide-up`}
          >
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <div className={`w-12 h-1 rounded-full ${dark ? "bg-gray-600" : "bg-gray-300"}`} />
              </div>
              {renderPanel()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
