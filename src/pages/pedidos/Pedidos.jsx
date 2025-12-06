import React, { useState, useMemo, useEffect, useRef } from "react";
import { ListPedido } from "../proveedores/components/ListPedido";
import { useAppContext } from "../../contexto/Context";
import { toast, ToastContainer } from "react-toastify";

export default function Pedidos() {
  const { pedidos, limpiarPedidos, proveedores, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

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

  // 1) Si hay proveedor seleccionado → usar ese
  if (proveedorSeleccionado) {
    const proveedor = proveedores.find(
      (p) => p.id === parseInt(proveedorSeleccionado)
    );

    if (!proveedor || !proveedor.telefono) {
      toast.error("⚠️ El proveedor seleccionado no tiene un número válido.");
      return;
    }

    numero = proveedor.telefono;
  } 
  // 2) Si NO hay proveedor → usar teléfono manual si existe
  else if (telefonoManual && telefonoManual.trim() !== "") {
    numero = telefonoManual;
  } 
  // 3) Si no hay proveedor NI teléfono manual → error
  else {
    toast.warning("⚠️ Debes seleccionar un proveedor o ingresar un número.");
    return;
  }

  // Limpiar el número
  const numeroFinal = `549${numero.replace(/\D/g, "")}`;

  // Enviar
  const url = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
};


  const cardBg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300 placeholder-gray-500";
  const textGray = dark ? "text-gray-200" : "text-gray-800";

  return (
    <div className={`min-h-screen w-full mx-auto flex gap-4 ${dark ? "bg-gray-900" : "bg-gray-50"} p-4 rounded-lg`}>
      <div className={`flex-1 overflow-y-auto max-h-[90vh] p-3 border rounded-2xl shadow-sm ${cardBg}`}>
        <ListPedido />
      </div>

      <div className={`w-[280px] sticky top-4 self-start p-5 shadow-xl rounded-2xl border ${dark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}>
        <div className="flex flex-col gap-3">
          {/* SELECT DE PROVEEDOR */}
          <select
            value={proveedorSeleccionado}
            onChange={(e) => setProveedorSeleccionado(e.target.value)}
            className={`p-3 rounded-lg w-full border focus:ring-2 focus:ring-blue-400 ${inputBg}`}
          >
            <option value="">Selecciona un proveedor</option>
            {proveedores.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.nombre}
              </option>
            ))}
          </select>

          {/* MOSTRAR TELÉFONO O INPUT MANUAL */}
          {(() => {
            const proveedor = proveedores.find(
              (p) => p.id === parseInt(proveedorSeleccionado)
            );

            if (proveedor) {
              return (
                <h1 className={`text-lg font-semibold ${textGray}`}>
                  Teléfono: {proveedor.telefono || "No registrado"}
                </h1>
              );
            }

            return (
              <input
                type="text"
                value={telefonoManual}
                onChange={(e) => setTelefonoManual(e.target.value)}
                placeholder="Ingresar teléfono del proveedor"
                className={`p-3 rounded-lg w-full border focus:ring-2 focus:ring-blue-400 ${inputBg}`}
              />
            );
          })()}
        </div>

        <button
          onClick={copiarAlPortapapeles}
          className="cursor-pointer text-lg hover:bg-blue-600 mt-3 p-3 bg-blue-500 text-white rounded-lg w-full transition-all"
        >
          📋 Copiar
        </button>

        <button
          onClick={enviarPorWhatsApp}
          className="cursor-pointer text-lg hover:bg-green-600 mt-3 p-3 bg-green-500 text-white rounded-lg w-full transition-all"
        >
          📲 Enviar por WhatsApp
        </button>

        <BotonConfirmarAccion
          onConfirmar={limpiarPedidos}
          textoBoton="Borrar Todo"
          icono="🗑️"
          claseColor="bg-red-500"
          textoConfirmar="¿Borrar toda la lista?"
          dark={dark}
        />

        <div className={`text-lg mt-5 p-3 rounded-xl text-center font-semibold shadow-inner ${dark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800"}`}>
          <p>💰 Total estimado: </p>
          <p className="text-xl">
            $
            {parseInt(totalEstimado)
              .toFixed(2)
              .replace(/\.00$/, "")
              .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export function BotonConfirmarAccion({
  onConfirmar,
  textoBoton = "Acción",
  icono = "",
  claseColor = "bg-red-500",
  textoConfirmar = "¿Estás seguro?",
  dark = false,
}) {
  const [confirmando, setConfirmando] = useState(false);
  const refContenedor = useRef(null);

  const bgConfirm = dark ? "bg-gray-700 text-gray-200" : "bg-white text-gray-800";
  const borderConfirm = dark ? "border-gray-600" : "border-gray-300";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (refContenedor.current && !refContenedor.current.contains(e.target)) {
        setConfirmando(false);
      }
    };

    if (confirmando) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [confirmando]);

  return (
    <div ref={refContenedor} className="relative w-full">
      <button
        onClick={() => setConfirmando(true)}
        className={`cursor-pointer text-lg hover:opacity-90 mt-3 p-3 ${claseColor} text-white rounded-lg w-full transition-all`}
      >
        {icono} {textoBoton}
      </button>

      {confirmando && (
        <div className={`absolute right-full top-0 z-20 ${bgConfirm} border ${borderConfirm} shadow-lg rounded-md p-3 w-40 text-sm`}>
          <p className="font-medium mb-2">{textoConfirmar}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onConfirmar();
                setConfirmando(false);
              }}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Sí
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
