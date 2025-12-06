import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { supabase } from "../services/supabaseClient";

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

export const useVentas = ({ userId }) => {
  const [ventas, setVentas] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [error, setError] = useState(null);

  const [filtro, setFiltro] = useState("dia");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [mesSeleccionado, setMesSeleccionado] = useState(
    dayjs().format("YYYY-MM")
  );

  // -----------------------------------------------------
  // FETCH VENTAS + DETALLES
  // -----------------------------------------------------
  const fetchVentas = async () => {
    setLoadingVentas(true);
    try {
      const { data: sales, error: errSales } = await supabase
        .from("user_sales")
        .select(
          `
          id,
          fecha,
          monto_total,
          user_sales_detail (
            id,
            cantidad,
            precio_unitario,
            precio_compra,
            product_id
          )
        `
        )
        .eq("user_id", userId)
        .order("fecha", { ascending: false });

      if (errSales) throw errSales;

      setVentas(sales ?? []);
      return sales;
    } catch (err) {
      console.log(err);
      setError(err.message);
    } finally {
      setLoadingVentas(false);
    }
  };

  // -----------------------------------------------------
  // CREAR VENTA + DETALLES + ACTUALIZAR STOCK
  // -----------------------------------------------------
  const crearVenta = async (dataCarrito, actualizarProductosPostVenta) => {
    try {
      // 1) Calcular total
      const montoTotal = dataCarrito.reduce(
        (acc, item) => acc + item.precio_venta * item.cantidad,
        0
      );

      // 2) Crear la venta
      const { data: nuevaVenta, error: errVenta } = await supabase
        .from("user_sales")
        .insert({
          user_id: userId,
          monto_total: montoTotal,
        })
        .select()
        .single();

      if (errVenta) throw errVenta;

      const saleId = nuevaVenta.id;

      // 3) Crear detalles
      const detallesPayload = dataCarrito.map((item) => ({
        sale_id: saleId,
        product_id: item.id, // ESTE "id" es el id de user_products
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        precio_compra: item.precio_compra,
      }));

      const { error: errDetalles } = await supabase
        .from("user_sales_detail")
        .insert(detallesPayload);

      if (errDetalles) throw errDetalles;

      // 4) Actualizar stock A
      for (const item of dataCarrito) {
        const nuevoStock = Number(item.stock) - Number(item.cantidad);

        const { error: errStock } = await supabase
          .from("user_products")
          .update({ stock: nuevoStock })
          .eq("id", item.id);

        if (errStock) throw errStock;
      }

      // Actualizar UI local
      const productosActualizados = dataCarrito.map((item) => ({
        id_producto: item.id,
        stock: Number(item.stock) - Number(item.cantidad),
      }));
      actualizarProductosPostVenta(productosActualizados);

      await fetchVentas();
      return true;
    } catch (err) {
      console.log(err);
      setError(err.message);
      return false;
    }
  };

  // -----------------------------------------------------
  // ELIMINAR UNA VENTA
  // -----------------------------------------------------
  const eliminarVenta = async (id_venta) => {
    setLoadingVentas(true);
    try {
      // 1) Eliminar detalles (constraint exige eliminar antes)
      await supabase.from("user_sales_detail").delete().eq("sale_id", id_venta);

      // 2) Eliminar venta
      const { error: errVenta } = await supabase
        .from("user_sales")
        .delete()
        .eq("id", id_venta);

      if (errVenta) throw errVenta;

      // 3) Actualizar UI local
      setVentas((prev) => prev.filter((v) => v.id !== id_venta));

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoadingVentas(false);
    }
  };

  // -----------------------------------------------------
  // ELIMINAR POR DIA
  // -----------------------------------------------------
  const eliminarPorDia = async (fecha) => {
    setLoadingVentas(true);
    try {
      const { data: ventasDia } = await supabase
        .from("user_sales")
        .select("id")
        .eq("user_id", userId)
        .gte("fecha", `${fecha} 00:00`)
        .lte("fecha", `${fecha} 23:59`);

      for (const venta of ventasDia) {
        await eliminarVenta(venta.id);
      }

      await fetchVentas();
    } finally {
      setLoadingVentas(false);
    }
  };

  // -----------------------------------------------------
  // ELIMINAR POR MES
  // -----------------------------------------------------
  const eliminarPorMes = async (mes) => {
    setLoadingVentas(true);
    try {
      const { data: ventasMes } = await supabase
        .from("user_sales")
        .select("id")
        .eq("user_id", userId)
        .gte("fecha", `${mes}-01`)
        .lte("fecha", `${mes}-31`);

      for (const venta of ventasMes) {
        await eliminarVenta(venta.id);
      }

      await fetchVentas();
    } finally {
      setLoadingVentas(false);
    }
  };

  // -----------------------------------------------------
  // ELIMINAR TODO
  // -----------------------------------------------------
  const eliminarTodo = async () => {
    setLoadingVentas(true);
    try {
      await supabase.from("user_sales_detail").delete().eq("sale_id", userId);
      await supabase.from("user_sales").delete().eq("user_id", userId);
      setVentas([]);
    } finally {
      setLoadingVentas(false);
    }
  };

  // -----------------------------------------------------
  // FILTRADO Y AGRUPAMIENTO (se mantiene igual que tu hook)
  // -----------------------------------------------------
  const ventasFiltradas = useMemo(() => {
    const hoy = dayjs();
    return ventas.filter((venta) => {
      const fechaVenta = dayjs(venta.fecha);

      if (filtro === "dia") return fechaVenta.isSame(fechaSeleccionada, "day");
      if (filtro === "mes") return fechaVenta.isSame(mesSeleccionado, "month");
      if (filtro === "semana")
        return fechaVenta.isBetween(
          hoy.startOf("week"),
          hoy.endOf("week"),
          null,
          "[]"
        );
      return true;
    });
  }, [ventas, filtro, fechaSeleccionada, mesSeleccionado]);

  const ventasAgrupadas = useMemo(() => {
    if (filtro === "semana") {
      const grouped = {};
      ventasFiltradas.forEach((venta) => {
        const fecha = dayjs(venta.fecha).format("YYYY-MM-DD");
        if (!grouped[fecha]) grouped[fecha] = [];
        grouped[fecha].push(venta);
      });
      return grouped;
    } else if (filtro === "mes") {
      const grouped = {};
      ventasFiltradas.forEach((venta) => {
        const semana = dayjs(venta.fecha).week();
        if (!grouped[semana]) grouped[semana] = [];
        grouped[semana].push(venta);
      });
      return grouped;
    }
    return ventasFiltradas;
  }, [ventasFiltradas, filtro]);

  // -----------------------------------------------------
  // INIT
  // -----------------------------------------------------
  useEffect(() => {
    if (userId) fetchVentas();
  }, [userId]);

  return {
    ventas,
    ventasFiltradas,
    ventasAgrupadas,
    loadingVentas,
    error,

    crearVenta,
    eliminarVenta,
    eliminarPorDia,
    eliminarPorMes,
    eliminarTodo,

    filtro,
    fechaSeleccionada,
    mesSeleccionado,
    handleFiltro: (f, d, m) => {
      setFiltro(f);
      if (d) setFechaSeleccionada(d);
      if (m) setMesSeleccionado(m);
    },
    setFechaSeleccionada,
    setMesSeleccionado,
    fetchVentas,
  };
};
