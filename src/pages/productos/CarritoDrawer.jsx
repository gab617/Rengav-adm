import React, { useState } from "react";
import { Carrito } from "../carrito/Carrito";
import { useAppContext } from "../../contexto/Context";

export function CarritoDrawer() {
  const [open, setOpen] = useState(false);
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  return (
    <>
      {/* BOTÓN FLOTANTE SOLO EN MOBILE */}
      <button
        onClick={() => setOpen(true)}
        className="
          lg:hidden
          fixed bottom-4 right-4 z-20
          w-14 h-14 rounded-full shadow-xl
          flex items-center justify-center
          transition-all
        "
        style={{
          background: dark ? "#facc15" : "#facc15",
        }}
      >
        <img
          src="/icons/cart.png"
          alt="carrito"
          className="w-8 h-8"
        />
      </button>

      {/* OVERLAY */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-10 transition-opacity
          ${open ? "opacity-100 pointer-events-auto lg:hidden" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* PANEL DESLIZABLE */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] sm:w-[60%] z-20
          shadow-2xl transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
          lg:hidden
          ${dark ? "bg-gray-800 text-white" : "bg-white text-gray-800"}
        `}
      >
        {/* Cerrar */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-xl"
        >
          ✕
        </button>

        <div className="p-4 mt-10">
          <Carrito />
        </div>
      </div>

      {/* VERSIÓN ESCRITORIO → SIEMPRE VISIBLE */}
      <div
        className={`hidden lg:block w-[22%] xl:w-[18%] p-4 rounded-lg shadow-lg
          ${dark ? "bg-gray-800 text-white" : "bg-white text-gray-800"}
        `}
      >
        <Carrito />
      </div>
    </>
  );
}
