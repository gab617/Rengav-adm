import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexto/AuthContext";
import { usePedidosRealtime } from "../hooksSB/usePedidosRealtime";
import { IconBell, IconArrowRight } from "./icons";
import {
  EVENTO_PEDIDOS_CAMBIO,
  sonarNotificacion,
  iniciarParpadeoTitulo,
  detenerParpadeoTitulo,
} from "../utils/notificaciones";

const RESPETA_MOVIMIENTO_REDUCIDO =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Tarjeta premium del toast de pedido nuevo: usa tokens adaptados a
// tema. El contenedor .toast-pedido-alerta solo aporta fondo/blur/shadow;
// el contenido lo arma este componente para no pelearse con el CSS.
function ContenidoPedido({ nombre, cantidad, onVer }) {
  const esPrimero = cantidad <= 1;

  return (
    <div className="flex items-center gap-3 min-w-[250px] px-3 py-2.5 md:px-4 md:py-3">
      <div className="relative shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
          <IconBell className="w-5 h-5 text-white" />
        </div>
        <span className="absolute -top-1 -right-1 flex w-3 h-3">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-3 h-3 rounded-full bg-emerald-500" />
        </span>
      </div>

      <button
        onClick={onVer}
        className="flex-1 min-w-0 text-left focus:outline-none"
      >
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
          {esPrimero ? (
            <>Pedido nuevo de <span className="truncate">{nombre}</span></>
          ) : (
            <>
              <span className="inline-block text-amber-600 dark:text-amber-400">{cantidad}</span> pedidos nuevos
            </>
          )}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          Tocá para confirmarlo
        </p>
      </button>

      <span
        onClick={onVer}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/25 cursor-pointer"
      >
        Ver
        <IconArrowRight className="w-3.5 h-3.5" />
      </span>
    </div>
  );
}

// Dueño del ÚNICO canal realtime de pedidos de la app.
// - INSERT: toast + sonido + parpadeo de título
// - Todo cambio se re-difunde por window (EVENTO_PEDIDOS_CAMBIO) para
//   que otros componentes (ej. badge del NavBar) reaccionen sin abrir
//   suscripciones propias.
export function NotificadorPedidos() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const toastIdRef = useRef(null);
  const cantidadRef = useRef(0);
  const flashTimerRef = useRef(null);

  // Titileo: alterna .toast-pedido-flash sobre el nodo del toast.
  // Es por JS porque los keyframes CSS pierden contra las utilidades
  // !important del toastClassName global (ver index.css).
  const detenerFlash = useCallback(() => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    document
      .querySelector(".toast-pedido-alerta")
      ?.classList.remove("toast-pedido-flash");
  }, []);

  const iniciarFlash = useCallback(() => {
    if (RESPETA_MOVIMIENTO_REDUCIDO || flashTimerRef.current) return;
    flashTimerRef.current = setInterval(() => {
      document
        .querySelector(".toast-pedido-alerta")
        ?.classList.toggle("toast-pedido-flash");
    }, 900);
  }, []);

  usePedidosRealtime(
    ({ evento, nuevo, anterior }) => {
      window.dispatchEvent(
        new CustomEvent(EVENTO_PEDIDOS_CAMBIO, {
          detail: { evento, nuevo, anterior },
        })
      );

      if (evento !== "insert") return;

      sonarNotificacion();

      cantidadRef.current += 1;
      iniciarParpadeoTitulo(cantidadRef.current);

      const esPrimero = cantidadRef.current === 1;
      const nombre = nuevo?.cliente?.nombre || "un cliente";

      const irAPedidos = () => {
        toast.dismiss(toastIdRef.current);
        navigate("/pedidos-web");
      };

      const contenido = (
        <ContenidoPedido
          nombre={nombre}
          cantidad={cantidadRef.current}
          onVer={irAPedidos}
        />
      );

      if (esPrimero || !toast.isActive(toastIdRef.current)) {
        toastIdRef.current = toast.info(contenido, {
          autoClose: false,
          className: "toast-pedido-alerta",
          onClick: irAPedidos,
          onClose: () => {
            toastIdRef.current = null;
            cantidadRef.current = 0;
            detenerParpadeoTitulo();
            detenerFlash();
          },
        });
        iniciarFlash();
      } else {
        toast.update(toastIdRef.current, {
          render: contenido,
          autoClose: false,
          className: "toast-pedido-alerta",
          onClick: irAPedidos,
        });
      }
    },
    { enabled: Boolean(user), eventos: ["INSERT", "UPDATE"] }
  );

  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (!document.hidden) detenerParpadeoTitulo();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      detenerParpadeoTitulo();
      detenerFlash();
    };
  }, [detenerFlash]);

  return null;
}
