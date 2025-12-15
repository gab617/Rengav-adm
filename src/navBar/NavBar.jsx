import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { menuItems } from "./consts";
import { useAppContext } from "../contexto/Context";

export function NavBar() {
  const location = useLocation();
  const { preferencias, updatePreferencias } = useAppContext();
  const [openMenu, setOpenMenu] = useState(false);

  const dark = preferencias?.theme === "dark";

  const toggleTheme = () => {
    updatePreferencias({ theme: dark ? "light" : "dark" });
  };

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
        <ul className="hidden md:flex gap-4 justify-center items-center mx-auto">
          {menuItems?.map(({ title, icon, path }) => {
            const isActive = location.pathname === path;

            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-colors duration-300
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
                  <span className="text-lg">{icon}</span>
                  <span className="font-medium">{title}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Botón de tema */}
        <button
          onClick={toggleTheme}
          className="
            absolute right-4 top-1/2 -translate-y-1/2
            w-[3em] h-[3em] rounded-full border
            flex items-center justify-center
            backdrop-blur-md
            transition-all duration-300 hover:scale-110
          "
        >
          <img
            src={dark ? "./tema-dark.png" : "./tema-light.png"}
            alt="theme toggle"
            className="w-[2em] h-[2em] opacity-90"
          />
        </button>
      </div>

      {/* Menú MOBILE desplegable */}
      <div
        className={`
          md:hidden overflow-hidden transition-all duration-300 
          ${openMenu ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
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
        </ul>
      </div>
    </nav>
  );
}
