import React, { useState, useEffect } from "react";
import { useAppContext } from "../../contexto/Context";

export function InfoApp() {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [tutorialActivo, setTutorialActivo] = useState(false);
  const [mostrarIndice, setMostrarIndice] = useState(false);
  const [paso, setPaso] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [imagenError, setImagenError] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const basePath = isMobile ? "/tutorial/mobile" : "/tutorial/desktop";

  const pasosTutorial = [
    {
      icono: "🛒",
      titulo: "Pantalla de ventas",
      descripcion:
        "Esta es la pantalla principal para realizar ventas. Desde aquí puedes buscar productos y agregarlos al carrito rápidamente.",
      ruta: "/ventas",
    },
    {
      icono: "🔍",
      titulo: "Buscador de productos",
      descripcion:
        "Utiliza el buscador para encontrar productos por nombre. Esto permite vender rápidamente sin recorrer toda la lista.",
      ruta: "/productos",
    },
    {
      icono: "📋",
      titulo: "Listado de productos",
      descripcion:
        "Aquí aparecen los productos disponibles. Puedes navegar por categorías o seleccionar productos directamente para agregarlos a la venta.",
      ruta: "/productos",
    },
    {
      icono: "⚖️",
      titulo: "Productos por peso",
      descripcion:
        "Los productos con icono de balanza se venden por peso. El sistema calcula automáticamente el precio según los gramos o kilos ingresados.",
      ruta: "/productos",
    },
    {
      icono: "🛍️",
      titulo: "Carrito de venta",
      descripcion:
        "Los productos seleccionados se agregan al carrito. Aquí puedes modificar cantidades, eliminar productos o revisar el total.",
      ruta: "/productos",
    },
    {
      icono: "✅",
      titulo: "Finalizar venta",
      descripcion:
        "Cuando el cliente termina su compra presiona finalizar venta. El sistema registrará la operación y descontará el stock automáticamente.",
      ruta: "/ventas",
    },
    {
      icono: "📦",
      titulo: "Gestión de productos",
      descripcion:
        "Desde el panel de productos puedes crear productos nuevos, modificar precios, cambiar stock y actualizar información.",
      ruta: "/usuario",
    },
    {
      icono: "🏷️",
      titulo: "Categorías y marcas",
      descripcion:
        "Los productos se organizan en categorías y marcas para facilitar la búsqueda y la administración del inventario.",
      ruta: "/usuario",
    },
    {
      icono: "📊",
      titulo: "Control de stock",
      descripcion:
        "El sistema descuenta automáticamente el stock cuando se realiza una venta. También puedes ajustarlo manualmente desde el panel de productos.",
      ruta: "/ventas",
    },
    {
      icono: "🏪",
      titulo: "Proveedores",
      descripcion:
        "Desde el módulo de proveedores puedes registrar a las personas o empresas que te venden productos.",
      ruta: "/proveedores",
    },
    {
      icono: "📝",
      titulo: "Pedidos",
      descripcion:
        "El sistema permite registrar pedidos a proveedores para llevar control de las compras realizadas.",
      ruta: "/pedidos",
    },
    {
      icono: "💰",
      titulo: "Inversiones",
      descripcion:
        "El módulo de inversiones permite registrar dinero invertido y calcular automáticamente las ganancias generadas.",
      ruta: "/ventas",
    },
    {
      icono: "📈",
      titulo: "Reportes del negocio",
      descripcion:
        "Puedes consultar reportes de ventas y movimientos para tener un control claro del rendimiento del negocio.",
      ruta: "/ventas",
    },
    {
      icono: "🔔",
      titulo: "Notificaciones",
      descripcion:
        "El sistema muestra notificaciones cuando ocurre una acción importante como ventas registradas o cambios en el sistema.",
      ruta: "/ventas",
    },
  ];

  const iniciarTutorial = (desdePaso = 0) => {
    setPaso(desdePaso);
    setTutorialActivo(true);
    setMostrarIndice(false);
    setImagenError(false);
  };

  const cerrarTutorial = () => {
    setTutorialActivo(false);
    setMostrarIndice(false);
  };

  const siguientePaso = () => {
    if (paso < pasosTutorial.length - 1) {
      setPaso(paso + 1);
      setImagenError(false);
    } else {
      cerrarTutorial();
    }
  };

  const anteriorPaso = () => {
    if (paso > 0) {
      setPaso(paso - 1);
      setImagenError(false);
    }
  };

  const irAPaso = (index) => {
    setPaso(index);
    setImagenError(false);
  };

  const toggleIndice = () => {
    setMostrarIndice(!mostrarIndice);
    setImagenError(false);
  };

  const bgMain = dark ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-900";
  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const borderCard = dark ? "border-gray-700" : "border-gray-200";
  const textMuted = dark ? "text-gray-400" : "text-gray-500";
  const textPrimary = dark ? "text-blue-400" : "text-blue-600";
  const bgModal = dark ? "bg-gray-800" : "bg-white";
  const bgOverlay = dark ? "bg-black/80" : "bg-black/70";
  const borderFocus = dark ? "border-blue-500" : "border-blue-400";

  return (
    <div className={`w-full min-h-screen p-4 md:p-6 flex flex-col gap-6 ${bgMain} transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
              Centro de ayuda
            </h1>
            <p className={`text-sm ${textMuted} mt-1`}>
              Aprende a utilizar todas las funciones del sistema de administración.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => iniciarTutorial(0)}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 flex items-center gap-2
              ${dark 
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"}`}
          >
            <span className="text-lg">▶</span>
            Iniciar tutorial
          </button>

          <button
            onClick={toggleIndice}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 flex items-center gap-2
              ${dark 
                ? "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600" 
                : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow"}`}
          >
            <span className="text-lg">📑</span>
            {mostrarIndice ? "Ocultar índice" : "Ver índice"}
          </button>

          <button
            onClick={() => localStorage.removeItem("tutorial_visto")}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all
              ${dark 
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
          >
            🔄 Reiniciar
          </button>
        </div>

        {mostrarIndice && (
          <div className={`${bgCard} border ${borderCard} rounded-xl p-6 mb-6 shadow-lg`}>
            <h2 className={`text-lg font-bold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>
              Índice del tutorial
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pasosTutorial.map((item, index) => (
                <button
                  key={index}
                  onClick={() => iniciarTutorial(index)}
                  className={`p-3 rounded-lg border ${borderCard} text-left transition-all hover:scale-[1.02] hover:${borderFocus}
                    ${dark 
                      ? "bg-gray-700/50 hover:bg-gray-700 hover:border-blue-500" 
                      : "bg-gray-50 hover:bg-gray-100 hover:border-blue-400"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.icono}</span>
                    <div>
                      <span className={`text-sm font-medium ${dark ? "text-gray-200" : "text-gray-800"}`}>
                        {index + 1}. {item.titulo}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pasosTutorial.slice(0, 6).map((item, index) => (
            <button
              key={index}
              onClick={() => iniciarTutorial(index)}
              className={`${bgCard} border ${borderCard} rounded-xl p-5 shadow-sm hover:shadow-lg transition-all transform hover:scale-[1.02] text-left group`}
            >
              <div className="flex items-start gap-3">
                <div className={`text-3xl group-hover:scale-110 transition-transform`}>
                  {item.icono}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>
                    {item.titulo}
                  </h3>
                  <p className={`text-sm ${textMuted} line-clamp-2`}>
                    {item.descripcion}
                  </p>
                </div>
              </div>
              <div className={`mt-3 text-sm font-medium ${textPrimary} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Ver →
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className={`text-sm ${textMuted}`}>
            Total: <span className="font-semibold">{pasosTutorial.length}</span> pasos
          </p>
        </div>
      </div>

      {tutorialActivo && (
        <div className={`fixed inset-0 ${bgOverlay} flex items-center justify-center z-50 p-4 backdrop-blur-sm`}>
          <div className={`${bgModal} w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
            <div className={`p-4 border-b ${borderCard} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{pasosTutorial[paso].icono}</span>
                <div>
                  <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                    {pasosTutorial[paso].titulo}
                  </h2>
                  <span className={`text-sm ${textMuted}`}>
                    {pasosTutorial[paso].ruta}
                  </span>
                </div>
              </div>
              <button
                onClick={cerrarTutorial}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${dark 
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-300" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className={`relative w-full ${bgCard} rounded-xl border ${borderCard} overflow-hidden flex items-center justify-center min-h-[300px] md:min-h-[400px]`}>
                {!imagenError ? (
                  <>
                    <img
                      src={`${basePath}/${pasosTutorial[paso].titulo.toLowerCase().replace(/\s+/g, '_')}.png`}
                      alt={pasosTutorial[paso].titulo}
                      className="max-h-[400px] w-auto object-contain"
                      onError={() => setImagenError(true)}
                    />
                    <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium
                      ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                      {isMobile ? "📱 Mobile" : "💻 Desktop"}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <div className="text-6xl">{pasosTutorial[paso].icono}</div>
                    <p className={`text-center ${textMuted}`}>
                      Captura no disponible<br/>
                      <span className="text-sm">
                        {isMobile ? "mobile" : "desktop"}/
                        {pasosTutorial[paso].titulo.toLowerCase().replace(/\s+/g, '_')}.png
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <p className={`mt-4 text-center ${dark ? "text-gray-300" : "text-gray-600"}`}>
                {pasosTutorial[paso].descripcion}
              </p>
            </div>

            <div className={`p-4 border-t ${borderCard}`}>
              <div className="flex flex-wrap gap-1 mb-4">
                {pasosTutorial.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => irAPaso(i)}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      i === paso 
                        ? (dark ? "bg-blue-500" : "bg-blue-600") 
                        : (dark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300")
                    }`}
                    title={`Paso ${i + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={anteriorPaso}
                  disabled={paso === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed
                    ${dark 
                      ? "bg-gray-700 hover:bg-gray-600 text-white" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                >
                  ← Anterior
                </button>

                <div className="flex items-center gap-2">
                  <span className={`text-sm ${textMuted}`}>
                    {paso + 1} / {pasosTutorial.length}
                  </span>
                </div>

                <button
                  onClick={siguientePaso}
                  className={`px-4 py-2 rounded-lg font-medium transition-all
                    ${dark 
                      ? "bg-blue-600 hover:bg-blue-500 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  {paso === pasosTutorial.length - 1 ? "Finalizar ✓" : "Siguiente →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
