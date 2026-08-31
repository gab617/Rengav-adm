import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexto/AuthContext";
import { usePedidosRealtime } from "../hooksSB/usePedidosRealtime";
import {
  EVENTO_PEDIDOS_CAMBIO,
  sonarNotificacion,
  iniciarParpadeoTitulo,
  detenerParpadeoTitulo,
} from "../utils/notificaciones";

const RESPETA_MOVIMIENTO_REDUCIDO =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    }, 500);
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
      const mensaje = esPrimero
        ? `🛒 Nuevo pedido de ${nombre} — Tocá para ver →`
        : `🛒 Tenés ${cantidadRef.current} pedidos nuevos sin confirmar — Tocá para ver →`;

      const irAPedidos = () => {
        toast.dismiss(toastIdRef.current);
        navigate("/pedidos-web");
      };

      if (esPrimero || !toast.isActive(toastIdRef.current)) {
        toastIdRef.current = toast.info(mensaje, {
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
          render: mensaje,
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
