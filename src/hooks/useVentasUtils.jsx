import { useState, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

export const useVentasUtils = (ventas = []) => {
  const [filtro, setFiltro] = useState("dia"); // dia, semana, mes
  const [fechaSeleccionada, setFechaSeleccionada] = useState(dayjs().format("YYYY-MM-DD"));
  const [mesSeleccionado, setMesSeleccionado] = useState(dayjs().format("YYYY-MM"));

  const ventasFiltradas = useMemo(() => {
    const hoy = dayjs();
    return ventas.filter((venta) => {
      const fechaVenta = dayjs(venta.fecha);
      if (filtro === "dia") return fechaVenta.isSame(fechaSeleccionada, "day");
      if (filtro === "mes") return fechaVenta.isSame(mesSeleccionado, "month");
      if (filtro === "semana")
        return fechaVenta.isBetween(hoy.startOf("week"), hoy.endOf("week"), null, "[]");
      return true;
    });
  }, [ventas, filtro, fechaSeleccionada, mesSeleccionado]);

  const ventasAgrupadas = useMemo(() => {
    if (filtro === "semana") {
      // Agrupar por día dentro de la semana
      const grouped = {};
      ventasFiltradas.forEach((venta) => {
        const fecha = dayjs(venta.fecha).format("YYYY-MM-DD");
        if (!grouped[fecha]) grouped[fecha] = [];
        grouped[fecha].push(venta);
      });
      return grouped;
    } else if (filtro === "mes") {
      // Agrupar por semana dentro del mes
      const grouped = {};
      ventasFiltradas.forEach((venta) => {
        const semana = dayjs(venta.fecha).week();
        if (!grouped[semana]) grouped[semana] = [];
        grouped[semana].push(venta);
      });
      return grouped;
    }
    // Por día o sin agrupamiento
    return ventasFiltradas;
  }, [ventasFiltradas, filtro]);

  const handleFiltro = (nuevoFiltro, nuevaFecha = null, nuevoMes = null) => {
    setFiltro(nuevoFiltro);
    if (nuevoFiltro === "dia" && nuevaFecha) setFechaSeleccionada(nuevaFecha);
    if (nuevoFiltro === "mes" && nuevoMes) setMesSeleccionado(nuevoMes);
  };

  return {
    filtro,
    fechaSeleccionada,
    mesSeleccionado,
    ventasFiltradas,
    ventasAgrupadas,
    handleFiltro,
    setFechaSeleccionada,
    setMesSeleccionado,
  };
};
