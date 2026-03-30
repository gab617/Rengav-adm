import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexto/AuthContext";
import { useNavigate } from "react-router-dom";
import { FormCustomProduct } from "../productos/components/FormCustomProduct";
import { useAppContext } from "../../contexto/Context";
import { UlCustomProducts } from "./components/UlCustomProducts";
import { Config } from "./components/Config";
import { InactiveProductsViewer } from "./components/InactiveProductsViewer";

export function Usuario() {
  const { logout, user } = useAuth();
  const { products, customProducts, preferencias, inactiveProducts } = useAppContext();
  const navigate = useNavigate();
  const dark = preferencias?.theme === "dark";

  const [activeTab, setActiveTab] = useState("productos");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // STATS
  const stats = useMemo(() => ({
    totalProductos: products.length || customProducts.length,
    productosActivos: products.filter(p => p.active !== false).length,
    productosCustom: customProducts.length,
    productosInactivos: inactiveProducts.length,
  }), [products, customProducts, inactiveProducts]);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgMain = dark ? "bg-gray-900" : "bg-gray-50";
  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900";

  const tabs = [
    { id: "productos", label: "Productos", icon: "📦", count: stats.productosCustom },
    { id: "config", label: "Configuración", icon: "⚙️", count: null },
    { id: "inactivos", label: "Inactivos", icon: "💤", count: stats.productosInactivos },
  ];

  return (
    <div className={`min-h-screen ${bgMain} transition-colors duration-300`}>
      {/* HEADER */}
      <div className={`p-4 md:p-6 ${bgCard} border-b ${borderColor}`}>
        <div className="max-w-4xl mx-auto">
          {/* TOP ROW */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>
                👤 Mi Panel
              </h1>
              <p className={`text-sm ${textSecondary}`}>
                {user?.email}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* TUTORIAL RÁPIDO */}
              <button
                onClick={() => setShowTutorial(true)}
                className={`p-2 rounded-xl transition-all ${
                  dark
                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                }`}
                title="Tutorial rápido"
              >
                📖
              </button>

              {/* TUTORIAL COMPLETO */}
              <button
                onClick={() => navigate("/info-app")}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  dark
                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                }`}
              >
                📚 Tutorial completo
              </button>

              {/* LOGOUT */}
              <button
                onClick={() => setShowLogoutModal(true)}
                className={`p-2 rounded-xl transition-all ${
                  dark
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-red-100 text-red-600 hover:bg-red-200"
                }`}
                title="Cerrar sesión"
              >
                🚪
              </button>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <div className={`p-3 rounded-xl ${dark ? "bg-gray-700/50" : "bg-gray-100"}`}>
              <p className={`text-xs ${textSecondary}`}>Total</p>
              <p className={`text-xl font-bold ${textPrimary}`}>{stats.totalProductos}</p>
            </div>
            <div className={`p-3 rounded-xl ${dark ? "bg-green-500/20" : "bg-green-50"}`}>
              <p className={`text-xs ${textSecondary}`}>Activos</p>
              <p className={`text-xl font-bold text-green-500`}>{stats.productosActivos}</p>
            </div>
            <div className={`p-3 rounded-xl ${dark ? "bg-blue-500/20" : "bg-blue-50"}`}>
              <p className={`text-xs ${textSecondary}`}>Custom</p>
              <p className={`text-xl font-bold text-blue-500`}>{stats.productosCustom}</p>
            </div>
            <div className={`p-3 rounded-xl ${dark ? "bg-yellow-500/20" : "bg-yellow-50"}`}>
              <p className={`text-xs ${textSecondary}`}>Inactivos</p>
              <p className={`text-xl font-bold text-yellow-500`}>{stats.productosInactivos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className={`px-4 ${bgCard} ${borderColor}`}>
        <div className="max-w-4xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? dark
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-100 text-blue-600"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  dark ? "bg-gray-700" : "bg-gray-200"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {activeTab === "productos" && (
          <div className="space-y-4">
            {/* FORMULARIO */}
            <div className={`p-4 rounded-2xl ${bgCard} border ${borderColor}`}>
              <h2 className={`text-lg font-bold mb-3 ${textPrimary}`}>
                ➕ Crear Producto Personalizado
              </h2>
              <FormCustomProduct userId={user?.id} />
            </div>

            {/* LISTA */}
            <div className={`p-4 rounded-2xl ${bgCard} border ${borderColor}`}>
              <h2 className={`text-lg font-bold mb-3 ${textPrimary}`}>
                📋 Mis Productos ({customProducts.length})
              </h2>
              {customProducts.length > 0 ? (
                <UlCustomProducts customProducts={customProducts} />
              ) : (
                <div className={`text-center py-8 ${textSecondary}`}>
                  <span className="text-4xl mb-2 block">📦</span>
                  <p>No tenés productos personalizados</p>
                  <p className="text-sm">Creá tu primer producto arriba</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className={`p-4 rounded-2xl ${bgCard} border ${borderColor}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>
              ⚙️ Configuración
            </h2>
            <Config />
          </div>
        )}

        {activeTab === "inactivos" && (
          <div className={`p-4 rounded-2xl ${bgCard} border ${borderColor}`}>
            <InactiveProductsViewer inactiveProducts={inactiveProducts} />
          </div>
        )}
      </div>

      {/* MODAL LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl shadow-2xl max-w-sm w-full ${bgCard}`}>
            <div className="text-center mb-4">
              <span className="text-5xl mb-3 block">🚪</span>
              <h3 className={`text-lg font-bold ${textPrimary}`}>
                Cerrar sesión
              </h3>
              <p className={`text-sm ${textSecondary} mt-1`}>
                ¿Estás seguro de que querés salir?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                  dark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TUTORIAL MODAL */}
      {showTutorial && (
        <TutorialModal dark={dark} onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}

// COMPONENTE TUTORIAL INTEGRADO
function TutorialModal({ dark, onClose }) {
  const [paso, setPaso] = useState(0);

  const pasos = [
    { icono: "🛒", titulo: "Pantalla de ventas", descripcion: "Pantalla principal para realizar ventas rápidamente." },
    { icono: "🔍", titulo: "Buscador", descripcion: "Encontrá productos por nombre de forma instantânea." },
    { icono: "📋", titulo: "Listado", descripcion: "Navegá por categorías o seleccioná productos directo." },
    { icono: "🛍️", titulo: "Carrito", descripcion: "Modificá cantidades, eliminá productos o revisá el total." },
    { icono: "✅", titulo: "Finalizar venta", descripcion: "Registrá la operación y descontá stock automáticamente." },
    { icono: "📦", titulo: "Gestión", descripcion: "Creá productos, modificá precios y actualizá stock." },
  ];

  const prev = () => paso > 0 && setPaso(paso - 1);
  const next = () => paso < pasos.length - 1 ? setPaso(paso + 1) : onClose();

  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`${bgCard} w-full max-w-md rounded-2xl shadow-2xl overflow-hidden`}>
        {/* HEADER */}
        <div className={`p-4 flex items-center justify-between border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{pasos[paso].icono}</span>
            <div>
              <h3 className={`font-bold ${textPrimary}`}>{pasos[paso].titulo}</h3>
              <p className={`text-xs ${textSecondary}`}>Tutorial rápido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 text-center">
          <p className={`text-lg ${textPrimary}`}>{pasos[paso].descripcion}</p>
        </div>

        {/* FOOTER */}
        <div className={`p-4 border-t ${borderColor}`}>
          {/* PROGRESS */}
          <div className="flex gap-1 mb-3">
            {pasos.map((_, i) => (
              <button
                key={i}
                onClick={() => setPaso(i)}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i === paso
                    ? dark ? "bg-blue-500" : "bg-blue-600"
                    : dark ? "bg-gray-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* NAV */}
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={paso === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-40 ${
                dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
              }`}
            >
              ← Anterior
            </button>
            <span className={`text-sm ${textSecondary}`}>{paso + 1}/{pasos.length}</span>
            <button
              onClick={next}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dark ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {paso === pasos.length - 1 ? "Listo ✓" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
