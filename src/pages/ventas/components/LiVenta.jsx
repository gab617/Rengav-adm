import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useAppContext } from "../../../contexto/Context";
import "./scrollbar.css";

const formatNumber = (num) => {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function LiVenta({
  venta,
  ventaActiva,
  mostrarDetalles,
  index,
  toggleVenta,
}) {
  const { eliminarVenta, confirmarVenta } = useAppContext();
  const [confirmando, setConfirmando] = useState(false);
  const cardRef = useRef(null);
  const isActive = ventaActiva === venta.id;

  if (!venta) return null;

  const totalVenta = venta.user_sales_detail
    ?.reduce(
      (acc, prod) => acc + Number(prod.precio_unitario) * Number(prod.cantidad),
      0
    )
    .toFixed(2);

  const gananciaEstimada = venta.user_sales_detail
    ?.reduce(
      (acc, prod) =>
        acc +
        (Number(prod.precio_unitario) - Number(prod.precio_compra)) *
          Number(prod.cantidad),
      0
    )
    .toFixed(2);

  const esPendiente = venta.estado === "pendiente";
  const borderColor = esPendiente
    ? "border-l-orange-400"
    : "border-l-emerald-500";

  return (
    <div className="relative w-full" ref={cardRef}>
      <li
        key={venta.id}
        className={`relative rounded-lg shadow-sm border border-gray-200 border-l-[3px] ${borderColor}
          bg-white hover:shadow-md transition-all duration-200 flex flex-col h-full
          ${isActive ? "ring-2 ring-blue-400 shadow-md" : ""}`}
      >
        {/* CABECERA — clickable */}
        <div
          className="flex-1 flex flex-col cursor-pointer p-2.5"
          onClick={() => toggleVenta(venta.id)}
        >
          {/* FILA 1: Fecha + Hora + Botón eliminar */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {dayjs(venta.fecha).format("DD MMM YYYY")}
              </span>
              <span className="text-xs font-bold text-gray-700">
                {dayjs(venta.fecha).format("HH:mm")} hs
              </span>
            </div>
            <BotonEliminarConConfirmacion
              onEliminar={() => eliminarVenta(venta.id)}
            />
          </div>

          {/* FILA 2: Nombre del cliente */}
          <div className="h-5 mb-1.5">
            {venta.cliente_nombre ? (
              <p className="text-[13px] font-bold text-gray-800 truncate leading-5">
                {venta.cliente_nombre}
              </p>
            ) : (
              <p className="text-[11px] text-gray-300 leading-5 italic">
                Sin cliente
              </p>
            )}
          </div>

          {/* FILA 3: Badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {esPendiente && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wide">
                Pendiente
              </span>
            )}
            {venta.metodo_pago && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                  venta.metodo_pago === "transferencia"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {venta.metodo_pago === "transferencia" ? "Transfer." : "Efectivo"}
              </span>
            )}
          </div>

          {/* FILA 4: Lista de productos — altura fija, scroll */}
          <div className="mb-2 border-t border-gray-100 pt-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">
                {venta.user_sales_detail?.length}{" "}
                {venta.user_sales_detail?.length === 1 ? "producto" : "productos"}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-px rounded transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {isActive ? "Ver todo" : "Ver detalle"}
              </span>
            </div>
            {venta.user_sales_detail?.length > 0 && (
              <div className="h-[56px] overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5">
                {venta.user_sales_detail.map((d, i) => (
                  <p
                    key={i}
                    className="text-[11px] font-semibold text-gray-600 truncate leading-[14px]"
                  >
                    {d.nombre_producto}
                    {d.cantidad > 1 && <span className="text-gray-400 font-normal"> x{d.cantidad}</span>}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* FILA 5: Total + ganancia — SIEMPRE al fondo, alineado */}
          <div className="mt-auto pt-1.5 border-t border-gray-100">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium leading-none mb-0.5">
                  Total
                </p>
                <p className="text-lg font-extrabold text-gray-900 leading-none">
                  ${formatNumber(totalVenta)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 leading-none mb-0.5">Ganancia</p>
                <p className="text-[11px] font-bold text-emerald-600">
                  ${formatNumber(gananciaEstimada)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÓN CONFIRMAR */}
        {esPendiente && (
          <div className="px-2.5 pb-2.5">
            <button
              disabled={confirmando}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmando(true);
                confirmarVenta(venta.id).then((ok) => {
                  setConfirmando(false);
                  if (ok) toast.success("✅ Venta confirmada");
                  else toast.error("❌ Error al confirmar");
                });
              }}
              className={`w-full text-[11px] font-bold py-1.5 rounded-md transition-all ${
                confirmando
                  ? "bg-gray-100 text-gray-400 cursor-wait"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
              }`}
            >
              {confirmando ? "..." : "✅ Confirmar"}
            </button>
          </div>
        )}
      </li>

      {/* DETALLE — overlay fijo, NO afecta el grid */}
      {isActive && (
        <DetalleVenta venta={venta} onClose={() => toggleVenta(null)} />
      )}
    </div>
  );
}

/* -------------------------------------------------------
   DETALLE OVERLAY — se posiciona debajo de la card,
   sin mover las demás cards del grid.
   ------------------------------------------------------- */
function DetalleVenta({ venta, onClose }) {
  const ref = useRef(null);

  const totalVenta = venta.user_sales_detail
    ?.reduce(
      (acc, prod) => acc + Number(prod.precio_unitario) * Number(prod.cantidad),
      0
    )
    .toFixed(2);

  const gananciaEstimada = venta.user_sales_detail
    ?.reduce(
      (acc, prod) =>
        acc +
        (Number(prod.precio_unitario) - Number(prod.precio_compra)) *
          Number(prod.cantidad),
      0
    )
    .toFixed(2);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={ref}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-base font-bold text-gray-800">
              Venta — {dayjs(venta.fecha).format("DD/MM/YYYY HH:mm")}
            </p>
            {venta.cliente_nombre && (
              <p className="text-sm text-gray-500 mt-0.5">
                👤 {venta.cliente_nombre}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-base"
          >
            ✕
          </button>
        </div>

        {/* Badges */}
        <div className="flex gap-2 px-4 py-2.5 border-b border-gray-50">
          {venta.estado && (
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              venta.estado === "pendiente"
                ? "bg-orange-100 text-orange-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {venta.estado === "pendiente" ? "⏳ Pendiente" : "✅ Confirmado"}
            </span>
          )}
          {venta.metodo_pago && (
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              venta.metodo_pago === "transferencia"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              💳 {venta.metodo_pago === "transferencia" ? "Transferencia" : "Efectivo"}
            </span>
          )}
        </div>

        {/* Lista de productos */}
        <ul className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scroll-smooth">
          {venta.user_sales_detail?.map((detalle) => {
            const totalDetalle =
              Number(detalle.precio_unitario) * Number(detalle.cantidad);
            const userProduct = detalle.user_products;
            const isBase = !!userProduct?.products_base;
            const marca = isBase
              ? userProduct?.products_base?.brands?.name
              : userProduct?.user_custom_products?.brands?.name ||
                userProduct?.user_custom_products?.brand_text;

            return (
              <li
                key={detalle.id}
                className="bg-gray-50 rounded-xl p-3.5 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {detalle.nombre_producto || "Producto"}
                  </p>
                  {marca && (
                    <p className="text-xs text-gray-400 mt-0.5">{marca}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">
                      x{detalle.cantidad}
                    </span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-500">
                      ${formatNumber(detalle.precio_unitario)} c/u
                    </span>
                    {detalle.talle && (
                      <>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          {detalle.talle}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-800 shrink-0">
                  ${formatNumber(totalDetalle)}
                </p>
              </li>
            );
          })}
        </ul>

        {/* Footer: Totales */}
        <div className="border-t border-gray-100 px-4 py-3.5 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{venta.user_sales_detail?.length} productos</span>
            <span>Ganancia: <span className="font-bold text-emerald-600">${formatNumber(gananciaEstimada)}</span></span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-gray-800">Total</span>
            <span className="text-xl font-extrabold text-gray-900">${formatNumber(totalVenta)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BotonEliminarConConfirmacion({ onEliminar }) {
  const [confirmando, setConfirmando] = useState(false);
  const refContenedor = useRef(null);

  useEffect(() => {
    const manejarClickAfuera = (e) => {
      if (refContenedor.current && !refContenedor.current.contains(e.target)) {
        setConfirmando(false);
      }
    };

    if (confirmando) {
      document.addEventListener("mousedown", manejarClickAfuera);
    }

    return () => {
      document.removeEventListener("mousedown", manejarClickAfuera);
    };
  }, [confirmando]);

  return (
    <div ref={refContenedor} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirmando(true);
        }}
        className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
      >
        ✕
      </button>

      {confirmando && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 shadow-lg rounded-lg p-2 flex flex-col items-center space-y-1.5 text-xs min-w-[100px]">
          <span className="text-gray-600 font-medium">¿Eliminar?</span>
          <div className="flex gap-1.5 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEliminar();
                setConfirmando(false);
              }}
              className="flex-1 bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 font-medium transition-colors"
            >
              Sí
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmando(false);
              }}
              className="flex-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200 font-medium transition-colors"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
