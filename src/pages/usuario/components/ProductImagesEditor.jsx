import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { toast } from "react-toastify";

const generarUuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const maxImagesCache = new Map();
const maxImagesPromises = new Map();

const getMaxProductImages = (tenantId) => {
  if (maxImagesCache.has(tenantId))
    return Promise.resolve(maxImagesCache.get(tenantId));
  if (!maxImagesPromises.has(tenantId)) {
    const p = supabase
      .from("tenants")
      .select("max_product_images")
      .eq("id", tenantId)
      .maybeSingle()
      .then(({ data }) => {
        const value = data?.max_product_images || 3;
        maxImagesCache.set(tenantId, value);
        maxImagesPromises.delete(tenantId);
        return value;
      })
      .catch(() => {
        maxImagesPromises.delete(tenantId);
        return 3;
      });
    maxImagesPromises.set(tenantId, p);
  }
  return maxImagesPromises.get(tenantId);
};

export function ProductImagesEditor({
  tenantId,
  productId,
  imagenes = [],
  onImagenesChange,
  dark,
}) {
  const [maxImagenes, setMaxImagenes] = useState(3);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!tenantId) return;

    getMaxProductImages(tenantId).then((v) => setMaxImagenes(v));
  }, [tenantId]);

  const publicUrl = (path) =>
    supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;

  const handleFiles = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";

    if (!archivos.length) return;

    if (!tenantId) {
      toast.error("El negocio no tiene tenant asignado, no se pueden subir imágenes");
      return;
    }

    const disponibles = maxImagenes - imagenes.length;
    if (disponibles <= 0) return;

    const aSubir = archivos.slice(0, disponibles);
    if (archivos.length > disponibles) {
      toast.warning(
        `Solo podés agregar ${disponibles} imagen(es) más (máx ${maxImagenes})`
      );
    }

    setSubiendo(true);
    const subidos = [];

    for (const file of aSubir) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" no es una imagen`);
        continue;
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${tenantId}/${productId}/${generarUuid()}.${ext}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type });

      if (error) {
        toast.error(`Error subiendo "${file.name}": ${error.message}`);
        continue;
      }

      subidos.push(path);
    }

    setSubiendo(false);

    if (subidos.length) {
      onImagenesChange([...imagenes, ...subidos]);
    }
  };

  const handleQuitar = async (idx) => {
    const path = imagenes[idx];
    const nuevas = imagenes.filter((_, i) => i !== idx);
    onImagenesChange(nuevas);

    const { error } = await supabase.storage
      .from("product-images")
      .remove([path]);

    if (error) {
      console.warn("No se pudo borrar la imagen del storage:", error.message);
    }
  };

  const mover = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= imagenes.length) return;

    const nuevas = [...imagenes];
    [nuevas[idx], nuevas[j]] = [nuevas[j], nuevas[idx]];
    onImagenesChange(nuevas);
  };

  const hacerPrincipal = (idx) => {
    if (idx === 0) return;
    const nuevas = [imagenes[idx], ...imagenes.filter((_, i) => i !== idx)];
    onImagenesChange(nuevas);
  };

  const completas = imagenes.length >= maxImagenes;
  const sinTenant = !tenantId;

  const btnBg = dark
    ? "bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
    : "bg-white hover:bg-gray-100 text-gray-700 border-gray-300";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold">
          Imágenes ({imagenes.length}/{maxImagenes})
        </label>
        {sinTenant && (
          <span className="text-xs text-red-500">
            Sin negocio asignado
          </span>
        )}
      </div>

      {imagenes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {imagenes.map((path, idx) => (
            <div
              key={path}
              className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 ${
                dark ? "border-gray-600" : "border-gray-300"
              }`}
            >
              <img
                src={publicUrl(path)}
                alt={`Imagen ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              <button
                type="button"
                onClick={() => hacerPrincipal(idx)}
                disabled={idx === 0}
                title={idx === 0 ? "Imagen principal" : "Hacer imagen principal"}
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs shadow ${
                  idx === 0
                    ? "bg-yellow-400 text-black"
                    : "bg-black/50 text-white hover:bg-black/70"
                }`}
              >
                ⭐
              </button>

              <button
                type="button"
                onClick={() => handleQuitar(idx)}
                title="Quitar imagen"
                className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white bg-red-600 hover:bg-red-500 shadow`}
              >
                ✕
              </button>

              <div className="absolute bottom-0 inset-x-0 flex justify-between p-0.5 bg-black/50">
                <button
                  type="button"
                  onClick={() => mover(idx, -1)}
                  disabled={idx === 0}
                  title="Mover a la izquierda"
                  className={`w-6 h-6 rounded flex items-center justify-center text-white ${
                    idx === 0
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-white/20"
                  }`}
                >
                  ←
                </button>
                <span className="text-[10px] text-white flex items-center">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => mover(idx, 1)}
                  disabled={idx === imagenes.length - 1}
                  title="Mover a la derecha"
                  className={`w-6 h-6 rounded flex items-center justify-center text-white ${
                    idx === imagenes.length - 1
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-white/20"
                  }`}
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={completas || sinTenant || subiendo}
        className={`w-full py-2 rounded-lg border text-sm font-medium transition-colors ${
          completas || sinTenant || subiendo
            ? "opacity-50 cursor-not-allowed"
            : btnBg
        }`}
      >
        {subiendo ? "Subiendo..." : completas ? "Límite alcanzado" : "📷 Agregar imagen"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFiles}
      />

      {!completas && !sinTenant && (
        <p className={`text-[10px] mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Podés elegir varias a la vez. El orden de la galería es el que ves acá.
        </p>
      )}

      {imagenes.length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (!confirm("¿Quitar TODAS las imágenes del producto?")) return;
            const todas = [...imagenes];
            onImagenesChange([]);
            supabase.storage
              .from("product-images")
              .remove(todas)
              .then(({ error }) => {
                if (error) {
                  console.warn(
                    "No se pudieron limpiar las imágenes del storage:",
                    error.message
                  );
                }
              });
          }}
          className={`mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
            dark
              ? "text-red-400 hover:bg-red-500/10"
              : "text-red-600 hover:bg-red-50"
          }`}
        >
          Quitar todas las imágenes
        </button>
      )}
    </div>
  );
}
