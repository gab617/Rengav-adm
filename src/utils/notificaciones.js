// Utilidades de notificación a nivel navegador, sin permisos ni assets.
// - sonarNotificacion(): ping de dos tonos generado con WebAudio.
//   Sujeto a la política de autoplay: suena recién después de la
//   primera interacción del usuario en la página (login cuenta).
// - Parpadeo de document.title estilo Gmail mientras la pestaña está oculta.

// Único canal realtime de pedidos (NotificadorPedidos). Los demás
// componentes escuchan este evento window con el detalle del cambio
// en vez de abrir sus propios canales.
export const EVENTO_PEDIDOS_CAMBIO = "pedidos:cambio";

let audioCtx = null;
let tituloTimer = null;
const TITULO_BASE = document.title;

export function sonarNotificacion() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const t = audioCtx.currentTime;
    [
      [880, 0],
      [1174.66, 0.15],
    ].forEach(([frecuencia, offset]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = frecuencia;
      gain.gain.setValueAtTime(0.0001, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, t + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.45);
    });
  } catch {
    // Audio bloqueado por el navegador: queda el parpadeo de título.
  }
}

export function iniciarParpadeoTitulo(cantidad) {
  detenerParpadeoTitulo();
  let alterna = false;
  const tick = () => {
    document.title = alterna
      ? `(${cantidad}) 🛒 Nuevo pedido · ${TITULO_BASE}`
      : TITULO_BASE;
    alterna = !alterna;
  };
  tituloTimer = setInterval(tick, 1000);
  tick();
}

export function detenerParpadeoTitulo() {
  if (tituloTimer) {
    clearInterval(tituloTimer);
    tituloTimer = null;
  }
  document.title = TITULO_BASE;
}
