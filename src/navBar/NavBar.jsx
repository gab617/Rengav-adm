import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { menuItems } from "./consts";
import { useAppContext } from "../contexto/Context";
import { useAuth } from "../contexto/AuthContext";
import { supabase } from "../services/supabaseClient";
import { EVENTO_PEDIDOS_CAMBIO } from "../utils/notificaciones";

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferencias, updatePreferencias, profile } = useAppContext();
  const [openMenu, setOpenMenu] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  const dark = preferencias?.theme === "dark";

  const esAdmin = profile?.role === "admin" || profile?.role === "super_admin";

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

        {/* Acciones a la derecha: campanita de pedidos + tema */}
        <div className="flex items-center gap-1 940:gap-1.5 xl:gap-2 shrink-0">
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
    </nav>
  );
}
