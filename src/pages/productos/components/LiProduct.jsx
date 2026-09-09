import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../contexto/Context";
import { EditProduct } from "./EditProduct";
import { DeleteProduct } from "./DeleteProduct";
import { Balanza } from "./liProductComponents/Balanza";
import { StepperCantidad } from "./liProductComponents/StepperCantidad";
import { TallesStock } from "./liProductComponents/TallesStock";
import { ProductModal } from "./ProductModal";
import {
  stockTallesToPayload,
  sumStockTalles,
} from "../../Admin/components/productsBase/components/StockPorTalle";
import { toast } from "react-toastify";
import { supabase } from "../../../services/supabaseClient";

function capitalizarMayus(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function LiProduct({
  prod,
  color,
  vista = "mosaico",
  tamano = "normal",
}) {
  const {
    actualizarProducto,
    eliminarProducto,
    eliminarProductoCarrito,
    agregarProductoCarrito,
    preferencias,
    carrito,
    actualizarStockEnCarrito,
    profile,
    sizesById,
    loadingSizes,
  } = useAppContext();

  const dark = preferencias?.theme === "dark";
  const esAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const ocultoBg = useMemo(() => {
    const color = dark ? "%23c4b5fd" : "%236d28d9";
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='110' height='38'>" +
      "<text x='55' y='27' font-family='Arial, sans-serif' font-size='11' font-weight='700' letter-spacing='2' text-anchor='middle' transform='rotate(-15 55 27)' fill='" +
      color +
      "' opacity='0.5'>OCULTO</text>" +
      "</svg>";
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [dark]);

  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editedProduct, setEditedProduct] = useState({
    ...prod,
    nombre:
      prod.tipo === "custom" ? prod.user_custom_products?.name : prod.nombre,
  });
  const [pesoSeleccionado, setPesoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [imagenIndex, setImagenIndex] = useState(0);

  useEffect(() => {
    setEditedProduct({
      ...prod,
      nombre:
        prod.tipo === "custom" ? prod.user_custom_products?.name : prod.nombre,
    });
    setIsEditing(false);
    setShowConfirmDelete(false);
    setShowProductModal(false);
    setCantidad(1);
    setImagenIndex(0);
  }, [prod.id]);

  const esPeso = prod.products_base?.type_unit === "weight";
  const hayTalles =
    !esPeso && (prod.products_base?.talles || []).length > 0;
  const esUnitario = !esPeso && !hayTalles;

  // Talles del producto (resueltos a objetos { id, name, sort_order }),
  // respetando el orden del catálogo.
  const productSizes = useMemo(() => {
    const ids = prod.products_base?.talles || [];
    return ids
      .map((id) => sizesById[id])
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [prod, sizesById]);

  const tieneStockTalles = hayTalles && !!prod.stock_talles;
  const enCarrito = carrito.some((item) => item.id === prod.id);
  const cantidadEnCarrito = carrito
    .filter((item) => item.id === prod.id)
    .reduce((acc, item) => acc + Number(item.cantidad), 0);
  const stockDisponible = Math.max(0, Number(prod.stock || 0) - cantidadEnCarrito);

  const precioVenta = parseFloat(prod.precio_venta) || 0;
  const precioCompra = parseFloat(prod.precio_compra) || 0;
  const sinPrecios = precioVenta <= 0 || precioCompra <= 0;
  const faltaPrecioVenta = precioVenta <= 0;
  const faltaPrecioCompra = precioCompra <= 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "stock") {
      const numValue = Number(value);
      if (numValue < 0) return;
    }
    setEditedProduct({ ...editedProduct, [name]: value });
  };

  const handleCancel = () => setIsEditing(false);

  const handleAgregarCarrito = (opts = {}) => {
    if (sinPrecios) {
      let msg = "⚠️ Faltan definir los siguientes precios:";
      if (faltaPrecioVenta) msg += "\n• Precio de VENTA";
      if (faltaPrecioCompra) msg += "\n• Precio de COMPRA";
      msg += "\n\nEditá el producto para agregarlos.";
      toast.warning(msg);
      return;
    }

    // Producto con talles: el alta se hace desde el modal (elegir talle).
    if (hayTalles) {
      setShowProductModal(true);
      return;
    }

    if (esPeso) {
      if (!pesoSeleccionado) {
        alert("Seleccioná un peso primero");
        return;
      }

      const precioCalculado = Number(
        (Number(prod.precio_venta) * pesoSeleccionado).toFixed(2),
      );

      agregarProductoCarrito(prod, color, {
        peso: pesoSeleccionado,
        precioCalculado,
      });
    } else {
      agregarProductoCarrito(prod, color, opts);
    }
  };

  const handleSubmit = async () => {
    const payload = { ...editedProduct };
    if (payload.stock < 0) payload.stock = 0;
    delete payload.products_base;
    delete payload.id;

    if (hayTalles) {
      payload.stock_talles = stockTallesToPayload(payload.stock_talles || {}, {
        force: true,
      });
      payload.stock = sumStockTalles(payload.stock_talles);
    }

    await actualizarProducto(prod.id, payload);
    actualizarStockEnCarrito([
      {
        id_producto: prod.id,
        stock: Number(payload.stock),
        stock_talles: payload.stock_talles,
      },
    ]);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await eliminarProducto(prod.id);
    setShowConfirmDelete(false);
  };

  const precioFormateado = parseInt(prod.precio_venta)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const sizeClass =
    tamano === "chico"
      ? "scale-90 text-sm"
      : tamano === "grande"
        ? "scale-105 text-lg xl:text-xl"
        : "text-base";

  const sinStock = prod.stock <= 0;

  const imagenPrincipal = prod.imagenes?.[0] || prod.products_base?.image_url || null;
  const imagenes = useMemo(() => {
    const lista = Array.isArray(prod.imagenes) && prod.imagenes.length
      ? prod.imagenes.filter(Boolean)
      : [];
    return lista.length
      ? lista
      : prod.products_base?.image_url
        ? [prod.products_base.image_url]
        : [];
  }, [prod]);
  const imagenActual = imagenes[imagenIndex] || null;
  const nextImagen = (e) => {
    e.stopPropagation();
    if (imagenes.length < 2) return;
    setImagenIndex((i) => (i + 1) % imagenes.length);
  };
  const prevImagen = (e) => {
    e.stopPropagation();
    if (imagenes.length < 2) return;
    setImagenIndex((i) => (i - 1 + imagenes.length) % imagenes.length);
  };
  const publicUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const borderClass = prod.visible === false
    ? "border-violet-500 border-dashed"
    : sinStock
      ? "border-red-500"
      : enCarrito
        ? "border-yellow-500"
        : dark
          ? "border-gray-600"
          : "border-gray-400";

  return (
    <>
      <style>{`
        @keyframes star-twinkle {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: drop-shadow(0 0 3px rgba(250, 204, 21, 0.55));
          }
          50% {
            transform: scale(1.18) rotate(10deg);
            filter: drop-shadow(0 0 9px rgba(250, 204, 21, 0.95));
          }
        }
        .animate-star-twinkle {
          animation: star-twinkle 1.4s ease-in-out infinite;
        }
        .oculto-marca {
          background-image: ${ocultoBg};
          background-repeat: repeat;
          background-size: 110px 38px;
        }
        @media (max-width: 767px) {
          .oculto-marca {
            background-size: 72px 25px;
          }
        }
      `}</style>
      <li
        key={prod.id}
        className={`
        group relative isolate
        rounded-xl border-2 transition-all duration-200
        ${vista === "listado"
          ? "flex items-center justify-between md:p-2 md:h-[60px] gap-2"
          : "flex flex-col justify-between p-2 pt-5 min-h-[110px]"
        }
        ${sizeClass}
        ${borderClass}
        ${enCarrito ? "ring-2 ring-yellow-500 ring-offset-2" : ""}
        group-hover:shadow-lg
      `}
      style={{
        backgroundColor: prod.visible === false
          ? dark
            ? "rgba(139, 92, 246, 0.28)"
            : "rgba(167, 139, 250, 0.25)"
          : sinStock
            ? dark
              ? "rgba(220, 38, 38, 0.2)"
              : "rgba(254, 226, 226, 1)"
            : enCarrito
              ? dark
                ? "rgba(250, 204, 21, 0.15)"
                : "rgba(250, 204, 21, 0.1)"
              : dark
                ? "#1f2937"
                : "white",
        color: dark ? "white" : "black",
      }}
    >
      {enCarrito && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
          {esPeso ? `${cantidadEnCarrito.toFixed(3)}kg` : `x${cantidadEnCarrito}`}
        </div>
      )}

      {prod.destacado && (
        <div
          className={`absolute -top-3 w-6 h-6 rounded-full flex items-center justify-center text-sm bg-yellow-400 shadow-lg z-10 animate-star-twinkle ${
            enCarrito ? "right-12" : "-right-2"
          }`}
          title="Producto destacado"
        >
          ⭐
        </div>
      )}

      {prod.visible === false && (
        <div className="oculto-marca absolute inset-0 pointer-events-none -z-10 select-none overflow-hidden" />
      )}

      {sinStock && (
        <div className="absolute -top-3 -left-2 sm:-top-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10 animate-pulse">
          SIN STOCK
        </div>
      )}

      {sinPrecios && !sinStock && (
        <div className="absolute -top-3 -left-2 sm:-top-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10 animate-pulse">
          ⚠️ {faltaPrecioVenta && faltaPrecioCompra ? "SIN PRECIOS" : faltaPrecioVenta ? "SIN PRECIO VENTA" : "SIN PRECIO COMPRA"}
        </div>
      )}

      {/* ================= VISTA LISTADO ================= */}
      {vista === "listado" ? (
<div
  className={`relative flex flex-wrap items-center gap-x-2 gap-y-1.5 w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-colors ${
    dark ? "text-white bg-gray-900/40" : "text-gray-900 bg-white"
  }`}
>
  {/* Imagen / Thumb */}
  {imagenPrincipal ? (
    <div
      className="flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0 items-center justify-center overflow-hidden transition-transform duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
      style={{ backgroundColor: color }}
      onClick={() => setShowProductModal(true)}
      title="Ver detalle"
    >
      <img
        src={publicUrl(imagenPrincipal)}
        alt=""
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        className="w-full h-full object-contain p-0.5"
      />
    </div>
  ) : (
    <div
      className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0 shadow-sm"
      style={{ backgroundColor: color }}
    />
  )}

  {/* Información compacta: nombre + talles + código */}
  <div className="flex flex-col min-w-0 w-full sm:w-auto sm:flex-1">
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className="font-medium text-sm truncate inline-flex items-center gap-1 leading-snug"
        title={prod.tipo === "custom" ? prod.user_custom_products?.name : prod.products_base?.name}
      >
        {prod.tipo === "custom" ? prod.user_custom_products?.name : prod.products_base?.name}
        {esPeso && <span className="text-xs shrink-0" title="Producto por peso">⚖️</span>}
        {enCarrito && <span className="text-green-500 text-xs font-bold shrink-0">✓</span>}
      </span>
      {prod.visible === false && (
        <span className="text-[9px] leading-none px-1 py-0.5 rounded-full bg-gray-600 text-white font-medium shrink-0">
          Oculto
        </span>
      )}
    </div>
    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
      {tieneStockTalles && (
        <TallesStock
          sizes={productSizes}
          stockTalles={prod.stock_talles}
          dark={dark}
          loading={loadingSizes}
        />
      )}
      <span className="font-mono">{`#${prod.custom_id ? "C-" : ""}${prod.id}`}</span>
    </div>
  </div>

  {/* Derecha: precio + asignación al carrito (izq) con admin a la derecha en mobile */}
  <div className="flex flex-wrap items-center justify-start gap-1.5 shrink-0 flex-1 min-w-0 sm:w-auto sm:flex-1 sm:justify-end sm:flex-nowrap">
    <span className={`text-sm font-bold whitespace-nowrap ${dark ? "text-green-400" : "text-green-700"}`}>
      ${precioFormateado}
    </span>

    {/* Asignación al carrito según tipo de producto */}
    {esPeso ? (
      <Balanza
        dark={dark}
        peso={pesoSeleccionado}
        onChange={setPesoSeleccionado}
      />
    ) : esUnitario ? (
      <StepperCantidad
        cantidad={cantidad}
        max={stockDisponible}
        onChange={setCantidad}
        dark={dark}
      />
    ) : (
      <button
        onClick={() => setShowProductModal(true)}
        className="h-8 w-8 flex items-center justify-center text-sm rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors shadow-sm active:scale-95"
        title="Elegir talle"
      >
        👕
      </button>
    )}

    {/* Acción principal: agregar/quitar al carrito */}
    {esUnitario ? (
      enCarrito ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            eliminarProductoCarrito(prod.id);
          }}
          title="Quitar del carrito"
          className="h-8 w-8 flex items-center justify-center text-sm rounded-lg bg-red-500 hover:bg-red-600 active:scale-95 text-white transition-all shadow-sm shrink-0"
        >
          ✕
        </button>
      ) : (
        <button
          onClick={() => handleAgregarCarrito({ cantidad })}
          className={`h-8 px-2.5 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-150 shadow-sm active:scale-95 ${
            sinPrecios
              ? "bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30"
              : "bg-green-600 hover:bg-green-500 text-white"
          }`}
          disabled={sinPrecios}
          title={sinPrecios ? "Faltan precios" : "Agregar al carrito"}
        >
          🛒
        </button>
      )
    ) : esPeso && !enCarrito ? (
      <button
        onClick={handleAgregarCarrito}
        className={`h-8 px-2.5 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-150 shadow-sm active:scale-95 ${
          sinPrecios
            ? "bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30"
            : !pesoSeleccionado
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-green-600 hover:bg-green-500 text-white"
        }`}
        disabled={sinPrecios || !pesoSeleccionado}
        title={sinPrecios ? "Faltan precios" : "Agregar al carrito"}
      >
        {pesoSeleccionado ? `${pesoSeleccionado.toFixed(2)}kg` : "🛒"}
      </button>
    ) : enCarrito ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          eliminarProductoCarrito(prod.id);
        }}
        title="Quitar del carrito"
        className="h-8 w-8 flex items-center justify-center text-sm rounded-lg bg-red-500 hover:bg-red-600 active:scale-95 text-white transition-all shadow-sm shrink-0"
      >
        ✕
      </button>
    ) : null}
  </div>

  {/* Botonera admin desplegable */}
  {esAdmin && (
    <div className="relative shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAdminMenuOpen((v) => !v);
        }}
        title="Acciones de administración"
        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors shadow-sm active:scale-95 ${
          dark
            ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </button>

      {adminMenuOpen && (
        <div
          className={`absolute right-0 top-9 z-30 flex items-center gap-1 p-1 rounded-xl shadow-xl border ${
            dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <button
            className="h-8 w-8 flex items-center justify-center text-xs sm:text-sm bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors shadow-sm active:scale-95"
            onClick={() => {
              setIsEditing(!isEditing);
              setAdminMenuOpen(false);
            }}
            title="Editar producto"
          >
            ✏️
          </button>

          <button
            className={`h-8 w-8 flex items-center justify-center text-xs sm:text-sm rounded-lg transition-all shadow-sm active:scale-95 ${
              prod.destacado
                ? "bg-yellow-400 text-black shadow-md hover:bg-yellow-300"
                : dark
                  ? "bg-gray-700 text-gray-400 hover:text-yellow-400 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-400 hover:text-yellow-500 hover:bg-gray-200"
            }`}
            onClick={() => actualizarProducto(prod.id, { destacado: !prod.destacado })}
            title={prod.destacado ? "Quitar de destacados" : "Marcar como destacado"}
          >
            ★
          </button>

          <button
            className={`h-8 w-8 flex items-center justify-center text-xs sm:text-sm rounded-lg transition-all shadow-sm active:scale-95 ${
              prod.visible === false
                ? "bg-violet-500 text-white hover:bg-violet-600"
                : dark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => actualizarProducto(prod.id, { visible: prod.visible === false })}
            title={prod.visible === false ? "Mostrar en catálogo" : "Ocultar del catálogo"}
          >
            {prod.visible === false ? "👁‍🗨" : "👁"}
          </button>

          <button
            className={`h-8 w-8 flex items-center justify-center text-xs sm:text-sm rounded-lg transition-all shadow-sm active:scale-95 ${
              dark
                ? "bg-gray-700 text-red-400 hover:bg-red-600 hover:text-white"
                : "bg-gray-100 text-red-500 hover:bg-red-500 hover:text-white"
            }`}
            onClick={() => {
              setShowConfirmDelete(true);
              setAdminMenuOpen(false);
            }}
            title="Eliminar producto"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  )}
</div>
      ) : (
        <div className="w-full flex flex-col">
          {imagenActual && (
            <div
              className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border cursor-pointer"
              style={{ borderColor: dark ? "#374151" : "#e5e7eb", backgroundColor: dark ? "#111827" : "#f9fafb" }}
              onClick={() => setShowProductModal(true)}
              title="Ver detalle"
            >
              <img
                src={publicUrl(imagenActual)}
                alt={prod.products_base?.name || "Producto"}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                className="w-full h-full object-contain"
              />
              {imagenes.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImagen}
                    title="Imagen anterior"
                    aria-label="Imagen anterior"
                    className="absolute top-1/2 left-1 z-10 flex h-7 w-7 -translate-y-1/2 select-none items-center justify-center rounded-full bg-black/35 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
                  >
                    ⟨
                  </button>
                  <button
                    type="button"
                    onClick={nextImagen}
                    title="Imagen siguiente"
                    aria-label="Imagen siguiente"
                    className="absolute top-1/2 right-1 z-10 flex h-7 w-7 -translate-y-1/2 select-none items-center justify-center rounded-full bg-black/35 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
                  >
                    ⟩
                  </button>
                  <span className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {imagenIndex + 1}/{imagenes.length}
                  </span>
                  <div className="absolute inset-x-0 bottom-1.5 z-10 flex items-center justify-center gap-1">
                    {imagenes.map((_, i) => (
                      <span
                        key={i}
                        className={
                          i === imagenIndex
                            ? "h-1.5 w-1.5 rounded-full bg-white shadow"
                            : "h-1.5 w-1.5 rounded-full bg-white/40"
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex flex-col items-start justify-between gap-2 mb-2">
            <div className="w-full min-w-0 overflow-hidden">
              <div className="flex items-start gap-1.5">
                <span className={`font-semibold text-sm truncate max-w-full block ${dark ? "text-white" : "text-gray-900"}`}>
                  {prod.tipo === "custom"
                    ? prod.user_custom_products?.name
                    : prod.products_base?.name}
                </span>
                {esPeso && <span className="text-sm shrink-0">⚖️</span>}
                {prod.visible === false && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-600 text-white font-semibold shrink-0 whitespace-nowrap">
                    👁 Oculto tienda
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                  ${precioFormateado}
                </span>
                {!tieneStockTalles && (
                  <span className={`text-xs ${prod.stock <= 5 ? "text-red-500 font-bold" : dark ? "text-gray-400" : "text-gray-500"}`}>
                    Stock: {prod.stock}
                  </span>
                )}
                {hayTalles && (
                  <span className="text-xs" title="Producto con talles">👕</span>
                )}
              </div>
              {tieneStockTalles && (
                <TallesStock
                  sizes={productSizes}
                  stockTalles={prod.stock_talles}
                  dark={dark}
                  repartido
                  loading={loadingSizes}
                />
              )}
            </div>
          </div>
          {esPeso && (
            <div
              className={`w-full rounded-xl border p-2 ${
                dark
                  ? "border-yellow-500/40 bg-yellow-500/10"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wide ${
                    dark ? "text-yellow-400" : "text-yellow-600"
                  }`}
                >
                  ⚖️ Por peso
                </span>
                {pesoSeleccionado ? (
                  <button
                    onClick={() => setPesoSeleccionado(null)}
                    title="Limpiar peso"
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 transition-colors ${
                      dark
                        ? "bg-gray-700 text-gray-300 hover:bg-red-900/50 hover:text-red-400"
                        : "bg-white border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-500"
                    }`}
                  >
                    ✕
                  </button>
                ) : (
                  <span
                    className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    Ingresá el peso
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pesoSeleccionado !== null ? Math.round(pesoSeleccionado * 1000) : ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, "");
                      setPesoSeleccionado(val ? Number(val) / 1000 : null);
                    }}
                    placeholder="0"
                    className={`w-16 text-center px-1 py-2 font-semibold text-sm rounded-lg ${
                      dark
                        ? "bg-gray-800 text-white border border-gray-600"
                        : "bg-white text-gray-900 border border-gray-300"
                    }`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    g
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 flex-1">
                  {[0.05, 0.1, 0.5, 1].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        if (sinPrecios) {
                          let msg = "⚠️ Faltan definir los siguientes precios:";
                          if (faltaPrecioVenta) msg += "\n• Precio de VENTA";
                          if (faltaPrecioCompra) msg += "\n• Precio de COMPRA";
                          msg += "\n\nEditá el producto para agregarlos.";
                          toast.warning(msg);
                          return;
                        }
                        if (enCarrito) {
                          agregarProductoCarrito(prod, color, { peso: val });
                        } else {
                          setPesoSeleccionado((prev) => (prev || 0) + val);
                        }
                      }}
                      className={`min-w-[44px] px-1 py-2 flex-1 rounded-lg text-center text-xs font-semibold transition-colors ${
                        dark
                          ? "bg-gray-700 hover:bg-yellow-500/30"
                          : "bg-white border border-gray-200 hover:bg-yellow-100"
                      }`}
                    >
                      {val >= 1 ? "1k" : val * 1000 + "g"}
                    </button>
                  ))}
                </div>
              </div>
              <p
                className={`text-[10px] mt-1 ${
                  pesoSeleccionado
                    ? dark ? "text-yellow-400/80" : "text-yellow-600"
                    : dark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {pesoSeleccionado
                  ? `Total: ${pesoSeleccionado.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} kg`
                  : "Tocá un atajo o escribilo en gramos"}
              </p>
            </div>
          )}
          {esUnitario && !sinPrecios && stockDisponible > 0 && (
            <div className="flex items-center justify-between gap-1.5 w-full">
              <StepperCantidad
                cantidad={cantidad}
                max={stockDisponible}
                onChange={setCantidad}
                dark={dark}
              />
              <span
                className={`text-[10px] sm:text-xs ${
                  dark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                disp: {stockDisponible}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full">
              {enCarrito && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarProductoCarrito(prod.id);
                  }}
                  title="Quitar del carrito"
                  className="w-8 h-9 rounded-lg flex items-center justify-center text-base font-bold transition-all shadow-md bg-red-500 hover:bg-red-600 text-white shrink-0"
                >
                  ✕
                </button>
              )}
              <button
                className={`h-9 flex-1 min-w-0 rounded-lg flex items-center justify-center gap-1 px-2 text-xs sm:text-sm font-semibold transition-all shadow-md ${
                  enCarrito
                    ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/30"
                    : sinPrecios
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed shadow-none"
                      : esPeso && !pesoSeleccionado
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                        : esUnitario && cantidad > stockDisponible
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                          : "bg-green-600 hover:bg-green-500 text-white shadow-green-600/30"
                }`}
                onClick={() => {
                  if (esPeso && pesoSeleccionado && pesoSeleccionado > 0) {
                    agregarProductoCarrito(prod, color, { peso: pesoSeleccionado });
                    setPesoSeleccionado(null);
                  } else if (!esPeso) {
                    handleAgregarCarrito({ cantidad });
                    if (esUnitario) setCantidad(1);
                  }
                }}
                disabled={
                  sinPrecios ||
                  (esPeso && !pesoSeleccionado) ||
                  (esUnitario && cantidad > stockDisponible)
                }
                title={
                  sinPrecios
                    ? "Faltan precios"
                    : hayTalles
                      ? `Elegir talle (${(prod.products_base?.talles || []).length} disponibles)`
                      : esPeso
                        ? "Ingresá el peso y tocalo para agregar"
                        : enCarrito
                          ? "Agregar más"
                          : "Agregar al carrito"
                }
              >
                {sinPrecios ? (
                  <span className="truncate">⚠️ Precios</span>
                ) : hayTalles ? (
                  <span className="truncate">👕 Elegir talle</span>
                ) : esPeso ? (
                  pesoSeleccionado ? (
                    `${pesoSeleccionado.toFixed(2)}kg`
                  ) : (
                    <span className="truncate">⚖️ Agregar</span>
                  )
                ) : esUnitario && !enCarrito && cantidad > 1 ? (
                  <span className="truncate">🛒 Agregar {cantidad}</span>
                ) : enCarrito ? (
                  <span className="truncate">➕ Agregar más</span>
                ) : (
                  <span className="truncate">🛒 Agregar</span>
                )}
              </button>
              {esAdmin && (
                <button
                  className={`w-8 h-9 rounded-lg flex items-center justify-center text-sm transition-all shrink-0 shadow-md ${
                    dark ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-500 hover:bg-blue-400 text-white"
                  }`}
                  onClick={() => setIsEditing(!isEditing)}
                  title="Editar producto"
                >
                  ✏️
                </button>
              )}
              {esAdmin && (
                <div className="flex items-center gap-1.5 w-full md:w-auto">
                  <button
                    className={`w-7 h-9 rounded-lg flex items-center justify-center text-xs transition-all shrink-0 flex-1 md:flex-none shadow-sm ${
                      prod.destacado
                        ? "bg-yellow-400 text-black shadow-md shadow-yellow-400/40 hover:bg-yellow-300"
                        : dark
                          ? "bg-gray-700 text-gray-400 hover:text-yellow-400 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-400 hover:text-yellow-500 hover:bg-yellow-100"
                    }`}
                    onClick={() => actualizarProducto(prod.id, { destacado: !prod.destacado })}
                    title={prod.destacado ? "Quitar de destacados" : "Marcar como destacado"}
                  >
                    ★
                  </button>
                  <button
                    className={`w-7 h-9 rounded-lg flex items-center justify-center text-xs transition-all shrink-0 flex-1 md:flex-none shadow-sm ${
                      prod.visible === false
                        ? "bg-violet-500 text-white shadow-md shadow-violet-500/40 hover:bg-violet-600"
                        : dark
                          ? "bg-gray-700 text-gray-300 hover:text-gray-100 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => actualizarProducto(prod.id, { visible: prod.visible === false ? true : false })}
                    title={prod.visible === false ? "Mostrar en catálogo" : "Ocultar del catálogo"}
                  >
                    {prod.visible === false ? "👁‍🗨" : "👁"}
                  </button>
                  <button
                    className={`w-7 h-9 rounded-lg flex items-center justify-center text-xs transition-all shrink-0 flex-1 md:flex-none shadow-sm ${
                      dark
                        ? "bg-gray-700 text-red-400 hover:bg-red-600 hover:text-white"
                        : "bg-gray-100 text-red-500 hover:bg-red-500 hover:text-white"
                    }`}
                    onClick={() => setShowConfirmDelete(true)}
                    title="Eliminar producto"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

          {enCarrito && (
            <div className={`text-xs font-medium mb-1.5 ${dark ? "text-yellow-400" : "text-yellow-700"}`}>
              ✓ {esPeso ? `${cantidadEnCarrito.toFixed(3)}kg` : `x${cantidadEnCarrito} en carrito`}
            </div>
          )}

          <div className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            {capitalizarMayus(prod.products_base?.brand || prod.products_base?.brand_text || "-")}
          </div>
        </div>
      )}

      {/* ================= MODALES ================= */}
      <div className="relative">
        {isEditing && (
          <EditProduct
            editedProduct={editedProduct}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            handleCancel={handleCancel}
          />
        )}
        {showConfirmDelete && (
          <DeleteProduct
            handleDelete={handleDelete}
            setShowConfirmDelete={setShowConfirmDelete}
            productId={prod.id}
            esCustom={prod.custom_id != null}
            imagenesCount={prod.imagenes?.length || 0}
          />
        )}
        {showProductModal && (
          <ProductModal
            prod={prod}
            color={color}
            onClose={() => setShowProductModal(false)}
          />
        )}
      </div>
    </li>
    </>
  );
}
