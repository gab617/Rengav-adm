import React, { useState, useEffect, useRef, useCallback } from "react";
import { Carrito } from "../carrito/Carrito";
import { useAppContext } from "../../contexto/Context";
import { CarritoMobile } from "../carrito/CarritoMobile";
import { ToastContainer } from "react-toastify";

export function CarritoDrawer() {
  const [open, setOpen] = useState(false);
  const [mostrarMiniResumen, setMostrarMiniResumen] = useState(false);
  const { preferencias, carrito, calcularTotal } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const drawerRef = useRef(null);
  const overlayRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const drawerClicked = useRef(false);

  useEffect(() => {
    if (carrito.length > 0) {
      setMostrarMiniResumen(true);
    } else {
      setMostrarMiniResumen(false);
      setOpen(false);
    }
  }, [carrito.length]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOverlayClick = useCallback((e) => {
    if (drawerClicked.current) {
      drawerClicked.current = false;
      return;
    }
    if (!drawerRef.current?.contains(e.target)) {
      setOpen(false);
    }
  }, []);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = false;
    drawerClicked.current = false;
  };

  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    if (diff > 10) {
      isDragging.current = true;
      drawerClicked.current = true;
    }
    if (diff > 0 && diff < 100 && isDragging.current) {
      e.target.closest("div").style.transform = `translateX(-${diff}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    const diff = startX.current - currentX.current;
    if (diff > 80 && isDragging.current) {
      setOpen(false);
    }
    if (drawerRef.current) {
      drawerRef.current.style.transform = "";
    }
    isDragging.current = false;
  };

  const handleDrawerClick = useCallback((e) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      drawerClicked.current = false;
      return;
    }
    drawerClicked.current = true;
    e.stopPropagation();
  }, []);

  const handleDrawerMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    startX.current = e.clientX;
    drawerClicked.current = false;
  }, []);

  const handleDrawerMouseMove = useCallback((e) => {
    if (e.buttons !== 1) return;
    const diff = startX.current - e.clientX;
    if (diff > 10) {
      isDragging.current = true;
      drawerClicked.current = true;
    }
    if (diff > 0 && diff < 100 && isDragging.current) {
      drawerRef.current.style.transform = `translateX(-${diff}px)`;
    }
  }, []);

  const handleDrawerMouseUp = useCallback((e) => {
    const diff = startX.current - e.clientX;
    if (diff > 80 && isDragging.current) {
      setOpen(false);
    }
    if (drawerRef.current) {
      drawerRef.current.style.transform = "";
    }
    isDragging.current = false;
  }, []);

  const totalFormateado = calcularTotal()
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (
    <>
      {/* MINI RESUMEN FLOTANTE - Solo mobile, cuando hay productos */}
      {mostrarMiniResumen && !open && (
        <button
          onClick={() => setOpen(true)}
          className={`
            lg:hidden
            fixed bottom-[1rem] left-[70%] -translate-x-1/2 z-30
            px-[2.5em] py-3 rounded-full shadow-2xl
            flex items-center gap-3
            animate-bounce-subtle
            transition-all duration-300
            hover:scale-105 active:scale-95
            ${dark
              ? "bg-gradient-to-r from-yellow-500 to-yellow-400 text-black"
              : "bg-gradient-to-r from-green-500 to-green-400 text-white"
            }
          `}
        >
          <img src="./cart.png" alt="carrito" className="w-6 h-6" />
          <span className="font-bold">
            {carrito.length} {carrito.length === 1 ? "producto" : "productos"}
          </span>
          <span className="opacity-75">|</span>
          <span className="font-bold">${totalFormateado}</span>
        </button>
      )}

      {/* OVERLAY */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-10 transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          lg:hidden
        `}
      />
      
      {/* PANEL DESLIZABLE */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleDrawerMouseDown}
        onMouseMove={handleDrawerMouseMove}
        onMouseUp={handleDrawerMouseUp}
        onClick={handleDrawerClick}
        onMouseLeave={() => { isDragging.current = false; }}
        className={`fixed top-0 right-0 h-full z-20
          shadow-2xl transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
          lg:hidden
          ${dark ? "bg-gray-800 text-white" : "bg-white text-gray-800"}
        `}
        style={{ width: "85vw", maxWidth: "400px", touchAction: "pan-y" }}
      >
        {/* HEADER FIJO */}
        <div className={`
          sticky top-0 z-10 p-4 border-b
          flex items-center justify-between
          backdrop-blur-md
          ${dark ? "bg-gray-800/95 border-gray-700" : "bg-white/95 border-gray-200"}
        `}>
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${dark ? "bg-yellow-500/20" : "bg-yellow-100"}
            `}>
              <img src="./cart.png" alt="carrito" className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${dark ? "text-white" : "text-gray-900"}`}>
                Carrito
              </h2>
              <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {carrito.length} {carrito.length === 1 ? "producto" : "productos"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-colors
              ${dark
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }
            `}
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto" style={{ height: "calc(100vh - 140px)" }}>
          <CarritoMobile onClose={() => setOpen(false)} />
        </div>

        {/* INDICADOR DE SWIPE */}
        <div className={`
          absolute left-0 top-1/2 -translate-y-1/2
          w-1 h-16 rounded-r-full
          opacity-30
          ${dark ? "bg-gray-500" : "bg-gray-300"}
        `} />
      </div>

      {/* VERSIÓN ESCRITORIO → SIEMPRE VISIBLE */}
      <div
        className={`hidden lg:block w-[22%] xl:w-[18%] p-4 rounded-lg shadow-lg
          ${dark ? "bg-gray-800 text-white" : "bg-white text-gray-800"}
        `}
      >
        <Carrito />
      </div>
      
      <ToastContainer
        position="top-center"
        autoClose={3000}
        newestOnTop
        closeOnClick={false}
        draggable
        pauseOnHover
      />
      
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
