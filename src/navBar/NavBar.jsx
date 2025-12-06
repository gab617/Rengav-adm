import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { menuItems } from './consts';
import { useAppContext } from '../contexto/Context';

export function NavBar() {
  const location = useLocation();
  const { preferencias, updatePreferencias } = useAppContext();

  const dark = preferencias?.theme === "dark";

  // Función que realmente cambia el tema
  const toggleTheme = () => {
    updatePreferencias({ theme: dark ? "light" : "dark" });
  };

  return (
    <nav
      className={`sticky top-0 z-10 backdrop-blur-md shadow-md transition-colors
        ${dark ? 'bg-gray-800/90 text-white' : 'bg-white/80 text-gray-700'}`}
    >
      <ul className="flex gap-4 justify-center items-center px-4 py-2 relative">

        {/* Botón pequeño de cambio de modo */}
        <button
          onClick={toggleTheme}
          className="
            absolute right-4 top-1/2 -translate-y-1/2
            w-[3em] h-[3em] rounded-full border
            flex items-center justify-center
            backdrop-blur-md
            transition-all duration-300
            hover:scale-110
          "
        >
          <img
            src={dark ? "./tema-dark.png" : "./tema-light.png"}
            alt="theme toggle"
            className="w-[2em] h-[2em] opacity-90"
          />
        </button>

        {menuItems?.map(({ title, icon, path }) => {
          const isActive = location.pathname === path;

          return (
            <li key={path}>
              <Link
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors duration-300 border-2
                  ${
                    isActive
                      ? dark
                        ? 'bg-yellow-500 text-gray-900 border-yellow-400'
                        : 'bg-yellow-500 text-white border-yellow-500'
                      : dark
                        ? 'text-gray-300 hover:bg-yellow-600/30 hover:border-yellow-500'
                        : 'text-gray-700 hover:bg-yellow-100 hover:border-yellow-400'
                  }`}
              >
                <span className="text-lg">{icon}</span>
                <span className="font-medium">{title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
