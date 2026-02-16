import React, { useState, useMemo, useEffect, useRef } from "react";
import { ListPedido } from "../proveedores/components/ListPedido";
import { useAppContext } from "../../contexto/Context";
import { toast, ToastContainer } from "react-toastify";
import { ListaDeProductosSolicitados } from "./ListaDeProductosSolicitados";

export default function Pedidos() {
  const { pedidos, limpiarPedidos, proveedores, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const esMobile = window.innerWidth < 768;

  const [openPanel, setOpenPanel] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [telefonoManual, setTelefonoManual] = useState("");

  const generarMensaje = () => {
    if (pedidos.length === 0) return "🛒 No hay productos en la lista.";
    let mensaje = " *Lista de Pedido* \n\n";
    pedidos.forEach((item, index) => {
      mensaje += `${index + 1}. ${item.products_base.name} ✘ ${item.cantidad}\n`;
    });
    return mensaje;
  };

  const mensaje = generarMensaje();

  const totalEstimado = useMemo(() => {
    return pedidos
      .reduce(
        (total, item) => total + parseFloat(item.precio_compra) * item.cantidad,
        0
      )
      .toFixed(2);
  }, [pedidos]);

  const copiarAlPortapapeles = () => {
    navigator.clipboard.writeText(mensaje);
    toast.success("Lista copiada al portapapeles ✅");
  };

  const enviarPorWhatsApp = () => {
    let numero = "";

    if (proveedorSeleccionado) {
      const proveedor = proveedores.find(
        (p) => p.id === parseInt(proveedorSeleccionado)
      );
      if (!proveedor || !proveedor.telefono) {
        toast.error("⚠️ El proveedor seleccionado no tiene un número válido.");
        return;
      }
      numero = proveedor.telefono;
    } else if (telefonoManual && telefonoManual.trim() !== "") {
      numero = telefonoManual;
    } else {
      toast.warning("⚠️ Debes seleccionar un proveedor o ingresar un número.");
      return;
    }

    const numeroFinal = `+549${numero.replace(/\D/g, "")}`;
    const url = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const cardBg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600"
    : "bg-white text-gray-900 border-gray-300";

  // PANEL reutilizable
const renderPanel = () => (
  <div className="h-auto flex flex-col">
    
    {/* PARTE FIJA */}
    <div className="flex flex-col gap-3">
      <select
        value={proveedorSeleccionado}
        onChange={(e) => setProveedorSeleccionado(e.target.value)}
        className={`p-3 rounded-lg w-full border ${inputBg}`}
      >
        <option value="">Selecciona un proveedor</option>
        {proveedores.map((prov) => (
          <option key={prov.id} value={prov.id}>
            {prov.nombre}
          </option>
        ))}
      </select>

      {(() => {
        const proveedor = proveedores.find(
          (p) => p.id === parseInt(proveedorSeleccionado)
        );
        if (proveedor) {
          return <p>📞 Teléfono: {proveedor.telefono || "No registrado"}</p>;
        }
        return (
          <input
            type="text"
            value={telefonoManual}
            onChange={(e) => setTelefonoManual(e.target.value)}
            placeholder="Ingresar teléfono"
            className={`p-3 rounded-lg w-full border ${inputBg}`}
          />
        );
      })()}

      <button
        onClick={copiarAlPortapapeles}
        className="p-3 bg-blue-500 text-white rounded-lg w-full"
      >
        📋 Copiar
      </button>

      <button
        onClick={enviarPorWhatsApp}
        className="p-3 bg-green-500 text-white rounded-lg w-full"
      >
        📲 Enviar por WhatsApp
      </button>

      <button
        onClick={limpiarPedidos}
        className="p-3 bg-red-500 text-white rounded-lg w-full"
      >
        🗑️ Borrar Todo
      </button>

      <div className={`p-3 rounded-xl text-center font-semibold ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
        💰 Total estimado: $
        {parseInt(totalEstimado)
          .toFixed(2)
          .replace(/\.00$/, "")
          .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
      </div>
    </div>

    {/* PARTE SCROLL */}
    <div className="mt-4 flex-1 overflow-y-auto">
      <ListaDeProductosSolicitados pedidos={pedidos} dark={dark} />
    </div>

  </div>
);


  return (
    <div className={`min-h-screen w-full mx-auto flex sm:gap-4 ${dark ? "bg-gray-900" : "bg-gray-50"} p-1 sm:p-4`}>

      {/* BOTÓN MOBILE */}
      {esMobile && (
        <button
          onClick={() => setOpenPanel(true)}
          className="fixed z-50 top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg"
        >
          🛠️ Pedido
        </button>
      )}

      {/* LISTA */}
      <div className={`flex-1 overflow-y-auto  max-h-[90vh] p-1 sm:p-3 border rounded-2xl shadow-sm ${cardBg}`}>
        <ListPedido />
      </div>

      {/* PANEL DESKTOP */}
      {!esMobile && (
        <div className={`sm:w-[280px] max-h-[90vh] overflow-auto sticky top-4 self-start p-1 shadow-xl rounded-2xl border ${cardBg}`}>
          {renderPanel()}
        </div>
      )}

      {/* MODAL MOBILE */}
      {esMobile && openPanel && (
        <ModalPedido onClose={() => setOpenPanel(false)} dark={dark}>
          {renderPanel()}
        </ModalPedido>
      )}

      <ToastContainer />
    </div>
  );
}

function ModalPedido({ children, onClose, dark }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      
      <div className={`
        w-[95%] 
        max-w-md 
        h-[90vh]
        rounded-2xl 
        p-2
        shadow-xl 
        flex 
        flex-col
        ${dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"}
      `}>
        
        {/* HEADER FIJO */}
        <div className="flex justify-between items-center ">
          <h2 className="text-xl font-bold">Consola de Pedido</h2>
          <button onClick={onClose} className="text-xl">✖</button>
        </div>

        {/* CONTENIDO QUE CONTIENE SCROLL */}
        <div className="flex-1 overflow-auto h-max-[1em]">
          {children}
        </div>

      </div>
    </div>
  );
}

