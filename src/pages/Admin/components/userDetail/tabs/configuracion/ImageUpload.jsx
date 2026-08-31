import { useCallback, useImperativeHandle, useRef, useState } from "react";
import { supabase } from "../../../../../../services/supabaseClient";
import { toast } from "react-toastify";
import { compressBrandingImage } from "../../../../../../utils/compressImage";

export function ImageUpload({
  tenantId,
  tipo,
  label,
  hint,
  ownPath,
  value,
  onChange,
  ref,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const publicUrl = (path) =>
    path
      ? supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl
      : null;

  const hereda = ownPath == null && !!value;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressBrandingImage(file);
      const ext = "jpg";
      const path = `${tenantId}/branding/${tipo}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, compressed, { contentType: "image/jpeg" });

      if (error) throw error;

      // Borra la imagen propia anterior (si existe), NUNCA una heredada.
      if (ownPath && ownPath !== path) {
        await supabase.storage.from("product-images").remove([ownPath]);
      }

      onChange(path);
    } catch (err) {
      toast.error(`No se pudo subir ${label}: ${err.message}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = useCallback(async () => {
    if (ownPath) {
      await supabase.storage.from("product-images").remove([ownPath]);
    }
    onChange(null);
  }, [ownPath, onChange]);

  useImperativeHandle(
    ref,
    () => ({
      removeOwn: handleRemove,
    }),
    [handleRemove]
  );

  const preview = publicUrl(value);

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">{tipo === "logo" ? "🏪" : "🖼️"}</span>
        )}
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>

        <div className="flex items-center gap-2 mt-1">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            {uploading ? "Subiendo..." : "Subir imagen"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {ownPath && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Quitar
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-1">
          {imageHint(hereda, value, hint)}
        </p>
      </div>
    </div>
  );
}

function imageHint(hereda, value, hint) {
  if (hereda) return "Se está heredando del negocio. Subir una la reemplaza solo para esta sucursal.";
  if (!value) return "Sin imagen: se usa la del negocio si existe.";
  return hint;
}
