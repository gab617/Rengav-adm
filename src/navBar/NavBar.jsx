import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
// motion se usa en JSX (<motion.div>) pero sin jsx-uses-vars el
// linter no ve referencias JSX y lo marca "unused". NO BORRAR.
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { menuItems } from "./consts";
import { useAppContext } from "../contexto/Context";
import { useAuth } from "../contexto/AuthContext";
import { supabase } from "../services/supabaseClient";
import { EVENTO_PEDIDOS_CAMBIO } from "../utils/notificaciones";
import { STOREFRONT_URL } from "../utils/storefront";

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferencias, updatePreferencias, profile, logoUrl, logoFit, logoZoom, logoPosition, storeUrl } = useAppContext();
  const [openMenu, setOpenMenu] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [modalTienda, setModalTienda] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const dark = preferencias?.theme === "dark";

  const esAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const publicUrl = (path) =>
    path
      ? supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl
      : null;

  // URL lista para compartir: sin el protocolo https://
  const storeUrlLimpia = storeUrl?.replace(/^https?:\/\//i, "") || storeUrl || "";

  // Copia la URL de la tienda al portapapeles, con fallback para contextos no seguros.
  const copiarUrl = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(storeUrlLimpia);
      } else {
        const ta = document.createElement("textarea");
        ta.value = storeUrlLimpia;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  }, [storeUrlLimpia]);

  const toggleTheme = () => {
    updatePreferencias({ theme: dark ? "light" : "dark" });
  };

  // Recuento real contra la base: carga inicial y red de seguridad
  // por si el socket perdió algún evento (foco / volver a la pestaña).
  const contarPendientes = useCallback(async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("estado", "pendiente");
      if (!error && typeof count === "number") setPendientes(count);
    } catch {
      // RLS/sesión: el badge simplemente no se actualiza.
    }
  }, [user]);

  useEffect(() => {
    contarPendientes();

    window.addEventListener("focus", contarPendientes);
    const alVisible = () => {
      if (!document.hidden) contarPendientes();
    };
    document.addEventListener("visibilitychange", alVisible);

    return () => {
      window.removeEventListener("focus", contarPendientes);
      document.removeEventListener("visibilitychange", alVisible);
    };
  }, [contarPendientes]);

  // Aritmética local con el detalle del cambio: cero consultas extra.
  // INSERT de un pendiente suma; UPDATE ajusta según entre/sale del estado.
  useEffect(() => {
    const alCambio = (e) => {
      const { evento, nuevo, anterior } = e.detail || {};
      if (evento === "insert") {
        if (nuevo?.estado === "pendiente") setPendientes((p) => p + 1);
        return;
      }
      if (evento === "update") {
        const era = anterior?.estado === "pendiente";
        const es = nuevo?.estado === "pendiente";
        if (era && !es) setPendientes((p) => Math.max(0, p - 1));
        else if (!era && es) setPendientes((p) => p + 1);
      }
    };
    window.addEventListener(EVENTO_PEDIDOS_CAMBIO, alCambio);
    return () => window.removeEventListener(EVENTO_PEDIDOS_CAMBIO, alCambio);
  }, []);

  // Cerrar el modal de la tienda con la tecla Escape
  useEffect(() => {
    if (!modalTienda) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModalTienda(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalTienda]);

  return (
    <nav
      className={`sticky top-0 z-20 backdrop-blur-md shadow-md transition-colors
        ${dark ? "bg-gray-800/90 text-white" : "bg-white/80 text-gray-700"}
      `}
    >
      <div className="relative flex justify-between items-center px-4 py-2">

        {/* Botón hamburguesa SOLO en mobile */}
        <button
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg"
          onClick={() => setOpenMenu(!openMenu)}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Menú horizontal DESKTOP */}
        <ul className="hidden md:flex gap-x-1.5 940:gap-x-2 xl:gap-x-4 justify-center items-center flex-1 min-w-0">
          {menuItems?.map(({ title, icon, path }) => {
            const isActive = location.pathname === path;

            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center gap-1 px-2 py-1 text-xs 940:gap-1.5 940:px-2.5 940:py-1.5 940:text-sm xl:gap-2 xl:px-4 xl:py-2 xl:text-base rounded-full border-2 transition-colors duration-300
                    ${
                      isActive
                        ? dark
                          ? "bg-yellow-500 text-gray-900 border-yellow-400"
                          : "bg-yellow-500 text-white border-yellow-500"
                        : dark
                          ? "text-gray-300 hover:bg-yellow-600/30 hover:border-yellow-500"
                          : "text-gray-700 hover:bg-yellow-100 hover:border-yellow-400"
                    }
                  `}
                >
                  <span className="text-sm 940:text-base xl:text-lg">{icon}</span>
                  <span className="font-medium whitespace-nowrap">{title}</span>
                </Link>
              </li>
            );
          })}
          {esAdmin && (
            <li>
              <Link
                to="/admin"
                className={`flex items-center gap-1 px-2 py-1 text-xs 940:gap-1.5 940:px-2.5 940:py-1.5 940:text-sm xl:gap-2 xl:px-4 xl:py-2 xl:text-base rounded-full border-2 border-purple-500 shadow-md transition-colors duration-300
                  ${
                    location.pathname.startsWith("/admin")
                      ? dark
                        ? "bg-purple-500 text-white border-purple-400"
                        : "bg-purple-500 text-white border-purple-500"
                      : dark
                        ? "text-purple-300 hover:bg-purple-600/30"
                        : "text-purple-700 hover:bg-purple-100"
                  }
                `}
              >
                <span className="text-sm 940:text-base xl:text-lg">🛠️</span>
                <span className="font-semibold whitespace-nowrap">Admin</span>
              </Link>
            </li>
          )}
        </ul>

        {/* Acciones a la derecha: logo de la sucursal + campanita de pedidos + tema */}
        <div className="flex items-center gap-1 940:gap-1.5 xl:gap-2 shrink-0">
          {logoUrl && (
            <button
              onClick={() => storeUrl && setModalTienda(true)}
              title={profile?.name}
              aria-label="Ir a la tienda online"
              className="w-[2.25em] h-[2.25em] 940:w-[2.75em] 940:h-[2.75em] xl:w-[3.25em] xl:h-[3.25em] rounded-lg border overflow-hidden flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:scale-110"
            >
              <img
                src={publicUrl(logoUrl)}
                alt={profile?.name || "Logo"}
                className="w-full h-full"
                style={{
                  objectFit: logoFit || "cover",
                  objectPosition: logoPosition || "center",
                  transform: `scale(${logoZoom || "1"})`,
                }}
              />
            </button>
          )}

          <button
            onClick={() => navigate("/pedidos-web")}
            title="Pedidos web pendientes"
            className="relative w-[2em] h-[2em] 940:w-[2.5em] 940:h-[2.5em] xl:w-[3em] xl:h-[3em] rounded-full border flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:scale-110"
          >
            <span className="text-base 940:text-lg xl:text-xl">🔔</span>
            {pendientes > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
              >
                {pendientes > 99 ? "99+" : pendientes}
              </span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="w-[2em] h-[2em] 940:w-[2.5em] 940:h-[2.5em] xl:w-[3em] xl:h-[3em] rounded-full border flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:scale-110"
          >
            <img
              src={dark ? "./tema-dark.png" : "./tema-light.png"}
              alt="theme toggle"
              className="w-[1.25em] h-[1.25em] 940:w-[1.5em] 940:h-[1.5em] xl:w-[2em] xl:h-[2em] opacity-90"
            />
          </button>
        </div>
      </div>

      {/* Menú MOBILE desplegable */}
      <div
        className={`
          md:hidden overflow-hidden transition-all duration-300 
          ${openMenu ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <ul className="flex flex-col gap-2 p-4 pt-0">
          {menuItems?.map(({ title, icon, path }) => {
            const isActive = location.pathname === path;

            return (
              <li key={path}>
                <Link
                  to={path}
                  onClick={() => setOpenMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors duration-300
                    ${
                      isActive
                        ? dark
                          ? "bg-yellow-500 text-gray-900 border-yellow-400"
                          : "bg-yellow-500 text-white border-yellow-500"
                        : dark
                          ? "text-gray-300 hover:bg-yellow-600/30 hover:border-yellow-500"
                          : "text-gray-700 hover:bg-yellow-100 hover:border-yellow-400"
                    }
                  `}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium">{title}</span>
                </Link>
              </li>
            );
          })}
          {esAdmin && (
            <li>
              <Link
                to="/admin"
                onClick={() => setOpenMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-purple-500 shadow-md transition-colors duration-300"
              >
                <span className="text-xl">🛠️</span>
                <span className="font-semibold">Admin</span>
              </Link>
            </li>
          )}
        </ul>
      </div>

      {/* Modal: visitar la tienda online (portal para que fixed quede contra el viewport, no contra el nav con backdrop-filter) */}
      {createPortal(
        <AnimatePresence>
          {modalTienda && storeUrl && (
            <motion.div
              key="modal-tienda"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              onClick={() => setModalTienda(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Visitar la tienda online"
            >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.8, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 340 }}
              className={`relative w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl ${
                dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
              }`}
            >
              <div
                className={`h-16 ${
                  dark
                    ? "bg-gradient-to-br from-yellow-400/25 via-amber-500/10 to-transparent"
                    : "bg-gradient-to-br from-yellow-100 via-amber-50 to-transparent"
                }`}
              />
<div className="absolute top-14 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-end gap-3">
                {/* Logo de la tienda online: estático de la web */}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl border-2 shadow-xl overflow-hidden flex items-center justify-center ${
                      dark ? "bg-gray-900 border-gray-600" : "bg-white border-gray-300"
                    }`}
                  >
                    <img
                      src={`${STOREFRONT_URL}/logostore.jpg`}
                      alt="Logo de la tienda online"
                      className="w-full h-full"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    Tienda online
                  </span>
                </motion.div>

                {/* Logo de la sucursal (el que usa el navbar) */}
                <motion.div
                  initial={{ scale: 0, rotate: 30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.2 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl border-2 shadow-xl overflow-hidden flex items-center justify-center text-3xl ${
                      dark ? "bg-gray-900 border-yellow-400" : "bg-white border-yellow-400"
                    }`}
                  >
                    {logoUrl ? (
                      <img
                        src={publicUrl(logoUrl)}
                        alt="Logo de la sucursal"
                        className="w-full h-full"
                        style={{
                          objectFit: logoFit || "cover",
                          objectPosition: logoPosition || "center",
                          transform: `scale(${logoZoom || "1"})`,
                        }}
                      />
                    ) : (
                      <span className="text-3xl">🏢</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    Sucursal
                  </span>
                </motion.div>
              </div>

              <div className="px-6 pt-10 pb-6 text-center">
                <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                  Visitar la tienda online
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  ¿Querés abrirla en una pestaña nueva?
                </p>

                <div className="mt-4 flex items-stretch gap-2">
                  <div
                    className={`flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 ${
                      dark
                        ? "border-gray-700 bg-gray-900/60 text-gray-300"
                        : "border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    <span className="text-sm shrink-0">🔗</span>
                    <span className="text-xs font-mono truncate">{storeUrlLimpia}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={copiarUrl}
                    aria-label="Copiar la URL de la tienda"
                    className={`shrink-0 rounded-xl border px-3 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      copiado
                        ? dark
                          ? "border-green-500/50 bg-green-500/15 text-green-400"
                          : "border-green-500/50 bg-green-100 text-green-600"
                        : dark
                          ? "border-gray-700 bg-gray-900/60 text-gray-300 hover:bg-gray-700"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {copiado ? "✅ Copiado" : "📋 Copiar"}
                  </motion.button>
                </div>

                <div className="mt-6 flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setModalTienda(false)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      dark
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Ahora no
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      window.open(storeUrl, "_blank", "noopener,noreferrer");
                      setModalTienda(false);
                    }}
                    className="flex-[1.4] px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-yellow-500 hover:bg-yellow-400 shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Ver tienda <span className="text-base leading-none">↗</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </nav>
  );
}
