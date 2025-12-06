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
            nombre_producto,
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
      // -----------------------------
      // 1) Calcular total
      // -----------------------------
      const montoTotal = dataCarrito.reduce(
        (acc, item) => acc + item.precio_venta * item.cantidad,
        0
      );

      // -----------------------------
      // 2) Crear la venta
      // -----------------------------
      const { data: nuevaVenta, error: errVenta } = await supabase
        .from("user_sales")
        .insert({
          user_id: userId,
          monto_total: montoTotal,
          fecha: new Date().toISOString(),
        })
        .select()
        .single();

      if (errVenta) throw errVenta;

      const saleId = nuevaVenta.id;

      // -----------------------------
      // 3) Crear detalles (BULK insert)
      // -----------------------------
      const detallesPayload = dataCarrito.map((item) => ({
        sale_id: saleId,
        nombre_producto: item.products_base.name,
        product_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        precio_compra: item.precio_compra,
      }));

      const { data: detalles, error: errDetalles } = await supabase
        .from("user_sales_detail")
        .insert(detallesPayload)
        .select();

      if (errDetalles) throw errDetalles;

      // -----------------------------
      // 4) Actualizar stocks via RPC (1 sola request)
      // -----------------------------
      const stockPayload = dataCarrito.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
      }));

      const { error: errStock } = await supabase.rpc("update_stocks", {
        products: stockPayload,
        uid: userId,
      });

      if (errStock) throw errStock;

      // -----------------------------
      // 5) Actualizar stock en el front
      // -----------------------------
      const productosActualizados = dataCarrito.map((item) => ({
        id_producto: item.id,
        stock: Number(item.stock) - Number(item.cantidad),
      }));

      actualizarProductosPostVenta(productosActualizados);

      // -----------------------------
      // 6) Agregar venta al estado local (sin refetch)
      // -----------------------------
      setVentas((prev) => [
        {
          ...nuevaVenta,
          user_sales_detail: detalles,
        },
        ...prev,
      ]);

      return true;
    } catch (err) {
      console.error(err);
      setError(err.message);
      return false;
    }
  };

  // -----------------------------------------------------
  // ELIMINAR UNA VENTA
  // -----------------------------------------------------
  const eliminarVenta = async (id_venta) => {
    try {
      await supabase.from("user_sales_detail").delete().eq("sale_id", id_venta);

      const { error: errVenta } = await supabase
        .from("user_sales")
        .delete()
        .eq("id", id_venta);

      if (errVenta) throw errVenta;

      // ⬅️ Actualizar estado local
      setVentas((prev) => prev.filter((v) => v.id !== id_venta));

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // -----------------------------------------------------
  // ELIMINAR POR DIA
  // -----------------------------------------------------
  const eliminarPorDia = async (fecha) => {
    setLoadingVentas(true);
    try {
      // 1) Obtener IDs del día
      const { data: ventasDia, error } = await supabase
        .from("user_sales")
        .select("id")
        .eq("user_id", userId)
        .gte("fecha", `${fecha} 00:00`)
        .lte("fecha", `${fecha} 23:59`);

      if (error) throw error;
      if (!ventasDia.length) return true;

      const ids = ventasDia.map((v) => v.id);

      // 2) Eliminar detalles
      const { error: errDetails } = await supabase
        .from("user_sales_detail")
        .delete()
        .in("sale_id", ids);

      if (errDetails) throw errDetails;

      // 3) Eliminar ventas
      const { error: errSales } = await supabase
        .from("user_sales")
        .delete()
        .in("id", ids);

      if (errSales) throw errSales;

      // 4) Actualizar UI
      setVentas((prev) => prev.filter((v) => !ids.includes(v.id)));

      return true;
    } catch (err) {
      setError(err.message);
      return false;
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
      // 1) Traer solo los IDs de las ventas del mes
      const { data: ventasMes, error } = await supabase
        .from("user_sales")
        .select("id")
        .eq("user_id", userId)
        .gte("fecha", `${mes}-01`)
        .lte("fecha", `${mes}-31`);

      if (error) throw error;

      if (!ventasMes.length) return true;

      const ids = ventasMes.map((v) => v.id);

      // 2) BORRAR DETALLES (1 request)
      const { error: errDetalles } = await supabase
        .from("user_sales_detail")
        .delete()
        .in("sale_id", ids);

      if (errDetalles) throw errDetalles;

      // 3) BORRAR VENTAS (1 request)
      const { error: errVentas } = await supabase
        .from("user_sales")
        .delete()
        .in("id", ids);

      if (errVentas) throw errVentas;

      // 4) Actualizar UI local (sin fetch)
      setVentas((prev) => prev.filter((v) => !ids.includes(v.id)));

      return true;
    } catch (err) {
      setError(err.message);
      return false;
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
      // 1) Traer IDs de todas las ventas del usuario
      const { data: allSales, error } = await supabase
        .from("user_sales")
        .select("id")
        .eq("user_id", userId);

      if (error) throw error;
      if (!allSales.length) {
        setVentas([]);
        return true;
      }

      const ids = allSales.map((v) => v.id);

      // 2) Borrar detalles
      await supabase.from("user_sales_detail").delete().in("sale_id", ids);

      // 3) Borrar ventas
      await supabase.from("user_sales").delete().in("id", ids);

      // 4) Actualizar UI
      setVentas([]);

      return true;
    } catch (err) {
      setError(err.message);
      return false;
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
