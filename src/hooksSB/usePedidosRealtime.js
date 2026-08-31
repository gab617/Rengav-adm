import { useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";

// Suscripción Realtime a cambios de la tabla pedidos.
//
// Contrato: el consumidor recibe { evento, nuevo, anterior } donde
// evento es 'insert'|'update', nuevo es la fila post-cambio y anterior
// el pre-cambio (solo poblado en UPDATE, gracias a REPLICA IDENTITY
// FULL del paso33). El consumidor no sabe NADA de
// canales/payloads crudos. Si algún día migramos de postgres_changes
// a Broadcast (escala ~3k suscriptores concurrentes), solo cambia el
// interior de este hook.
//
// RLS filtra server-side: cada usuario logueado recibe solo los
// pedidos que ya puede leer (su tenant; super_admin, todos).
// Con enabled=false no se abre canal. Requiere paso33 aplicado.
//
// OJO: cada consumidor debe pasar su propio `canal` si hay más de uno
// montado a la vez. supabase-js devuelve EL MISMO canal para nombres
// repetidos, y el removeChannel del primero mataría la suscripción
// de los demás. Ideal: UN canal por app y repartir con eventos.
export function usePedidosRealtime(
  onCambio,
  { enabled = true, eventos = ["INSERT"], canal = "pedidos-nuevos" } = {}
) {
  // Ref para no re-suscribir cuando el callback cambia de identidad
  // (los componentes recrean funciones en cada render).
  const onInsertRef = useRef(onCambio);
  onInsertRef.current = onCambio;

  // Clave estable para las deps: los literales ["INSERT","UPDATE"]
  // cambian de identidad en cada render y forzarían re-suscripciones.
  const eventosKey = eventos.join(",");

  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (payload) =>
      onInsertRef.current?.({
        evento: payload.eventType.toLowerCase(),
        nuevo: payload.new,
        anterior: payload.old,
      });

    // Un .on() por evento: postgres_changes NO acepta arrays de
    // eventos (solo un string o '*'); pasar un array hace que el
    // servidor rechace el join y llegue CHANNEL_ERROR.
    let channel = supabase.channel(canal);
    for (const ev of eventosKey.split(",")) {
      channel = channel.on(
        "postgres_changes",
        { event: ev, schema: "public", table: "pedidos" },
        handler
      );
    }

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[usePedidosRealtime] error en el canal");
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, canal, eventosKey]);
}
