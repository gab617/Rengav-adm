import imageCompression from "browser-image-compression";

const PRODUCT_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  initialQuality: 0.82,
  useWebWorker: false,
};

const BRANDING_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 800,
  initialQuality: 0.90,
  useWebWorker: false,
};

// Límite hardcodeado del bucket "product-images" en Supabase.
const MAX_BUCKET_SIZE = 5 * 1024 * 1024;

// Techo de seguridad: nunca mandar al bucket algo que se acerque al límite.
const MAX_SAFE_OUTPUT = 4.5 * 1024 * 1024;

const cargarComoImagen = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        img,
        ancho: img.naturalWidth,
        alto: img.naturalHeight,
      });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });

const redimensionarManual = async (file, maxDim) => {
  const { img, ancho, alto } = await cargarComoImagen(file);
  const escala = Math.min(1, maxDim / Math.max(ancho, alto));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(ancho * escala));
  canvas.height = Math.max(1, Math.round(alto * escala));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82)
  );
  if (!blob) throw new Error("El canvas no pudo generar el JPEG");

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
};

const comprimirConFallback = async (file, options, maxDim) => {
  if (file.size <= 150 * 1024) return file;

  try {
    const comprimida = await imageCompression(file, options);
    if (comprimida && comprimida.size <= MAX_SAFE_OUTPUT) return comprimida;
    console.warn(
      "[compressImage] output demasiado grande, se reconvierte manualmente:",
      comprimida?.size
    );
  } catch (err) {
    console.warn("[compressImage] browser-image-compression falló:", err);
  }

  try {
    return await redimensionarManual(file, maxDim);
  } catch (err) {
    console.warn("[compressImage] fallback manual falló:", err);
  }

  if (file.size <= MAX_BUCKET_SIZE) {
    return file;
  }

  throw new Error(
    `La imagen no se pudo comprimir y supera el límite del bucket (${(
      MAX_BUCKET_SIZE / 1024 / 1024
    ).toFixed(0)} MB)`
  );
};

export const compressImage = async (file) =>
  comprimirConFallback(file, PRODUCT_OPTIONS, 1200);

export const compressBrandingImage = async (file) =>
  comprimirConFallback(file, BRANDING_OPTIONS, 800);