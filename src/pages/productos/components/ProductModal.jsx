import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../../contexto/Context";
import { supabase } from "../../../services/supabaseClient";

const capitalizar = (texto) =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";

const formatearPrecio = (valor) => {
  const n = Number(valor) || 0;
  return n
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export function ProductModal({ prod, onClose, color }) {
  const { preferencias, categorias, subcategorias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const imagenes = useMemo(() => {
    const imgs = prod.imagenes?.filter(Boolean) || [];
    if (imgs.length) return imgs;
    const fallback = prod.products_base?.image_url;
    return fallback ? [fallback] : [];
  }, [prod]);

  const [indice, setIndice] = useState(0);
  const [imgError, setImgError] = useState(false);

  const publicUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage
      .from("product-images")
      .getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    setIndice(0);
    setImgError(false);
  }, [prod.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (imagenes.length > 1) {
        if (e.key === "ArrowRight")
          setIndice((i) => (i + 1) % imagenes.length);
        if (e.key === "ArrowLeft")
          setIndice((i) => (i - 1 + imagenes.length) % imagenes.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, imagenes.length]);

  const prev = () =>
    setIndice((i) => (i - 1 + imagenes.length) % imagenes.length);
  const next = () => setIndice((i) => (i + 1) % imagenes.length);

  const nombre =
    prod.tipo === "custom"
      ? prod.user_custom_products?.name || prod.products_base?.name
      : prod.products_base?.name;

  const marca =
    prod.products_base?.brand ?? prod.products_base?.brand_text ?? null;

  const categoria = categorias?.find(
    (c) => c.id === prod.products_base?.category_id,
  );
  const subcategoria = subcategorias?.find(
    (s) => s.id === prod.products_base?.subcategory_id,
  );

  const precioVenta = parseFloat(prod.precio_venta) || 0;
  const precioCompra = parseFloat(prod.precio_compra) || 0;
  const sinPrecios = precioVenta <= 0 || precioCompra <= 0;
  const sinStock = prod.stock <= 0;

  const cardBg = dark ? "bg-gray-900/60 border-gray-700" : "bg-gray-50 border-gray-200";
  const label = dark ? "text-gray-500" : "text-gray-500";
  const value = dark ? "text-white" : "text-gray-900";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] ${
          dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
            dark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3 className="text-lg font-bold truncate mr-2">
            {capitalizar(nombre) || "Producto"}
          </h3>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-lg shrink-0 ${
              dark
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* GALERÍA */}
          <div className="p-4 pb-2">
            <div
              className="relative w-full aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden border flex items-center justify-center"
              style={{
                borderColor: dark ? "#374151" : "#e5e7eb",
                backgroundColor: dark ? "#111827" : "#f9fafb",
              }}
            >
              {imagenes.length && !imgError ? (
                <img
                  src={publicUrl(imagenes[indice])}
                  alt={nombre || "Producto"}
                  className="w-full h-full object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-2"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-5xl">📦</span>
                  <span className={`text-sm font-medium ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    Sin imagen
                  </span>
                </div>
              )}

              {imagenes.length > 1 && !imgError && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white text-xl flex items-center justify-center transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white text-xl flex items-center justify-center transition-colors"
                  >
                    →
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {indice + 1}/{imagenes.length}
                  </div>
                </>
              )}
            </div>

            {imagenes.length > 1 && !imgError && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {imagenes.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => {
                      setIndice(idx);
                      setImgError(false);
                    }}
                    className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      idx === indice
                        ? "border-yellow-500 shadow-md"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={publicUrl(img)}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DATOS */}
          <div className="px-4 pb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  prod.tipo === "custom"
                    ? "bg-purple-500/20 text-purple-500 border border-purple-500/40"
                    : dark
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : "bg-blue-100 text-blue-700 border border-blue-300"
                }`}
              >
                {prod.tipo === "custom" ? "⭐ Custom" : "📦 Del sistema"}
              </span>
              {marca && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    dark
                      ? "bg-white/5 border-white/10 text-gray-300"
                      : "bg-gray-100 border-gray-300 text-gray-700"
                  }`}
                >
                  {capitalizar(marca)}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  dark
                    ? "bg-white/5 border-white/10 text-gray-400"
                    : "bg-gray-100 border-gray-300 text-gray-500"
                }`}
              >
                #{prod.custom_id ? "C-" : ""}
                {prod.id}
              </span>
              {sinStock && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                  SIN STOCK
                </span>
              )}
            </div>

            <div className={`rounded-xl border p-3 ${cardBg}`}>
              <p className={`text-xs font-semibold uppercase ${label}`}>Nombre</p>
              <p className={`text-base font-bold ${value}`}>
                {capitalizar(nombre) || "-"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl border p-3 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase ${label}`}>Precio venta</p>
                <p className={`text-xl font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                  ${formatearPrecio(prod.precio_venta)}
                </p>
              </div>
              <div className={`rounded-xl border p-3 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase ${label}`}>Precio compra</p>
                <p className={`text-lg font-semibold ${value}`}>
                  ${formatearPrecio(prod.precio_compra)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl border p-3 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase ${label}`}>Stock</p>
                <p
                  className={`text-lg font-bold ${
                    sinStock
                      ? "text-red-500"
                      : prod.stock <= 5
                        ? "text-orange-500"
                        : dark
                          ? "text-white"
                          : "text-gray-900"
                  }`}
                >
                  {prod.stock}
                </p>
              </div>
              {prod.proveedor_nombre && (
                <div className={`rounded-xl border p-3 ${cardBg}`}>
                  <p className={`text-xs font-semibold uppercase ${label}`}>Proveedor</p>
                  <p className={`text-sm font-medium ${value}`}>{prod.proveedor_nombre}</p>
                </div>
              )}
            </div>

            {prod.descripcion && (
              <div className={`rounded-xl border p-3 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase ${label}`}>Descripción</p>
                <p className={`text-sm ${value}`}>{prod.descripcion}</p>
              </div>
            )}

            {(categoria || subcategoria) && (
              <div className="flex flex-wrap gap-2">
                {categoria && (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: categoria.color }}
                  >
                    {categoria.nombre}
                  </span>
                )}
                {subcategoria && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      dark
                        ? "bg-white/5 border-white/10 text-gray-300"
                        : "bg-white border-gray-300 text-gray-600"
                    }`}
                  >
                    {subcategoria.nombre}
                  </span>
                )}
              </div>
            )}

            {sinPrecios && !sinStock && (
              <p className={`text-xs font-semibold ${dark ? "text-yellow-400" : "text-yellow-600"}`}>
                ⚠️ Faltan precios por definir para este producto
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
