import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import { EVENTO_PEDIDOS_CAMBIO } from "../utils/notificaciones";

const PAGE_SIZE = 50;

export function usePedidos({ userId }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(null); // id del pedido que se está procesando
  const [hasMore, setHasMore] = useState(true);
  const pageOffsetRef = useRef(0);

  const fetchPedidos = useCallback(async ({ append = false } = {}) => {
    if (!userId) {
      setPedidos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const from = append ? pageOffsetRef.current : 0;
      const to = from + PAGE_SIZE - 1;

      const { data, error: err } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err) throw err;

      const nuevos = data ?? [];

      if (append) {
        setPedidos((prev) => [...prev, ...nuevos]);
      } else {
        setPedidos(nuevos);
      }

      pageOffsetRef.current = from + nuevos.length;
      setHasMore(nuevos.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error fetching pedidos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchPedidos({ append: true });
  }, [loading, hasMore, fetchPedidos]);

  // -----------------------------------------------------
  // REALTIME vía window event (reutiliza NotificadorPedidos)
  // INSERT → prepend con dedupe | UPDATE → merge por id
  // -----------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      const { evento, nuevo } = e.detail || {};
      if (!nuevo) return;

      if (evento === "insert") {
        setPedidos((prev) => {
          if (prev.some((p) => p.id === nuevo.id)) return prev;
          return [nuevo, ...prev];
        });
      } else if (evento === "update") {
        setPedidos((prev) =>
          prev.map((p) => (p.id === nuevo.id ? { ...p, ...nuevo } : p))
        );
      }
    };

    window.addEventListener(EVENTO_PEDIDOS_CAMBIO, handler);
    return () => window.removeEventListener(EVENTO_PEDIDOS_CAMBIO, handler);
  }, []);

  // -----------------------------------------------------
  // CONFIRMAR PEDIDO → crear venta + descontar stock
  // -----------------------------------------------------
  const confirmarPedido = useCallback(async (pedido) => {
    setProcesando(pedido.id);
    try {
      const items = pedido.items || [];

      // 1) Buscar precio_compra de cada producto en user_products
      const productoIds = items.map((i) => i.producto_id);
      const { data: userProducts, error: errProducts } = await supabase
        .from("user_products")
        .select("id, precio_compra, precio_venta, stock, stock_talles")
        .in("id", productoIds);

      if (errProducts) throw errProducts;

      const productsMap = {};
      (userProducts || []).forEach((p) => {
        productsMap[p.id] = p;
      });

      // Verificar stock suficiente: contra el talle si el producto
      // tiene desglose y el pedido trae talle; si no, contra el stock general.
      for (const item of items) {
        const prod = productsMap[item.producto_id];
        if (!prod) {
          throw new Error(`Producto ${item.producto_id} no encontrado en tu sucursal`);
        }
        if (item.talle && prod.stock_talles && item.talle in prod.stock_talles) {
          const stockTalle = Number(prod.stock_talles[item.talle]) || 0;
          if (stockTalle < item.cantidad) {
            throw new Error(
              `Stock insuficiente para "${item.nombre}" (Talle ${item.talle}): tenés ${stockTalle}, el pedido pide ${item.cantidad}`
            );
          }
        } else if (prod.stock < item.cantidad) {
          throw new Error(
            `Stock insuficiente para "${item.nombre}": tenés ${prod.stock}, el pedido pide ${item.cantidad}`
          );
        }
      }

      // 2) Crear la venta en user_sales (con datos del cliente del pedido)
      const cliente = pedido.cliente || {};
      const { data: nuevaVenta, error: errVenta } = await supabase
        .from("user_sales")
        .insert({
          user_id: userId,
          monto_total: pedido.subtotal,
          fecha: new Date().toISOString(),
          cliente_nombre: cliente.nombre || null,
          cliente_telefono: cliente.telefono || null,
          cliente_email: cliente.email || null,
          metodo_pago: "efectivo",
          estado: "confirmado",
        })
        .select()
        .single();

      if (errVenta) throw errVenta;

      // 3) Crear detalles en user_sales_detail
      const detallesPayload = items.map((item) => ({
        sale_id: nuevaVenta.id,
        nombre_producto: item.nombre,
        product_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_compra: productsMap[item.producto_id]?.precio_compra || 0,
        talle: item.talle || null,
      }));

      const { data: detalles, error: errDetalles } = await supabase
        .from("user_sales_detail")
        .insert(detallesPayload)
        .select();

      if (errDetalles) throw errDetalles;

      // 4) Descontar stock via RPC
      const stockPayload = items.map((item) => ({
        id: item.producto_id,
        cantidad: item.cantidad,
        talle: item.talle || null,
      }));

      const { error: errStock } = await supabase.rpc("update_stocks", {
        products: stockPayload,
        uid: userId,
      });

      if (errStock) throw errStock;

      // 5) Actualizar estado del pedido a 'confirmado'
      const { error: errEstado } = await supabase
        .from("pedidos")
        .update({ estado: "confirmado" })
        .eq("id", pedido.id);

      if (errEstado) throw errEstado;

      // 6) Actualizar estado local
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedido.id ? { ...p, estado: "confirmado" } : p
        )
      );

      return { success: true, venta: nuevaVenta, detalles: detalles || [] };
    } catch (err) {
      console.error("Error confirmando pedido:", err);
      return { success: false, error: err.message };
    } finally {
      setProcesando(null);
    }
  }, [userId]);

  // -----------------------------------------------------
  // CANCELAR PEDIDO
  // -----------------------------------------------------
  const cancelarPedido = useCallback(async (pedido) => {
    setProcesando(pedido.id);
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "cancelado" })
        .eq("id", pedido.id);

      if (error) throw error;

      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedido.id ? { ...p, estado: "cancelado" } : p
        )
      );

      return { success: true };
    } catch (err) {
      console.error("Error cancelando pedido:", err);
      return { success: false, error: err.message };
    } finally {
      setProcesando(null);
    }
  }, []);

  // -----------------------------------------------------
  // FILTROS
  // -----------------------------------------------------
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const pedidosFiltrados = useMemo(() => {
    let base;
    if (filtroEstado === "todos") {
      base = pedidos;
    } else {
      base = pedidos.filter((p) => p.estado === filtroEstado);
    }
    // Priorizar pendientes primero
    return [...base].sort((a, b) => {
      if (a.estado === "pendiente" && b.estado !== "pendiente") return -1;
      if (a.estado !== "pendiente" && b.estado === "pendiente") return 1;
      return 0;
    });
  }, [pedidos, filtroEstado]);

  const contadores = useMemo(() => {
    return {
      todos: pedidos.length,
      pendientes: pedidos.filter((p) => p.estado === "pendiente").length,
      confirmados: pedidos.filter((p) => p.estado === "confirmado").length,
      cancelados: pedidos.filter((p) => p.estado === "cancelado").length,
    };
  }, [pedidos]);

  return {
    pedidos,
    pedidosFiltrados,
    loading,
    error,
    filtroEstado,
    setFiltroEstado,
    contadores,
    procesando,
    confirmarPedido,
    cancelarPedido,
    fetchPedidos,
    hasMore,
    loadMore,
  };
}
