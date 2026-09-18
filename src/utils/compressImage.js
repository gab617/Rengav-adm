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

// Lee ancho/alto de un JPEG leyendo SOLO el header (barato, sin decodificar
// la imagen completa). Devuelve null si el archivo no es un JPEG simple.
const leerDimensionesJpeg = async (file) => {
  try {
    const buf = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buf);

    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 <= buf.byteLength) {
      if (view.getUint8(offset) !== 0xff) return null;
      const marker = view.getUint8(offset + 1);
      const isSof =
        (marker >= 0xc0 && marker <= 0xcf) &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof) {
        const alto = view.getUint16(offset + 5);
        const ancho = view.getUint16(offset + 7);
        return { ancho, alto };
      }
      const len = view.getUint16(offset + 2);
      if (len < 2) return null;
      offset += 2 + len;
    }
    return null;
  } catch {
    return null;
  }
};

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

const dibujarAjpeg = (bitmap, ancho, alto, name, quality) =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, ancho);
    canvas.height = Math.max(1, alto);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("El canvas no pudo generar el JPEG"));
          return;
        }
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality
    );
  });

const redimensionarManual = async (file, maxDim, quality) => {
  const name = file.name.replace(/\.[^.$]+$/, "") + ".jpg";

  // Camino 1 (baja memoria): decodifica YA redimensionado. Solo maneja JPEG,
  // pero es el formato con el que fallaba el celular (image/jpeg).
  const dims = await leerDimensionesJpeg(file);
  if (dims) {
    const escala = Math.min(1, maxDim / Math.max(dims.ancho, dims.alto));
    const target = {
      ancho: Math.max(1, Math.round(dims.ancho * escala)),
      alto: Math.max(1, Math.round(dims.alto * escala)),
    };
    const bitmap = await createImageBitmap(file, {
      resizeWidth: target.ancho,
      resizeHeight: target.alto,
      resizeQuality: "high",
    });
    try {
      return await dibujarAjpeg(
        bitmap,
        target.ancho,
        target.alto,
        name,
        quality
      );
    } finally {
      bitmap.close();
    }
  }

  // Camino 2 (compatible con cualquier formato): Image + canvas, sirve como
  // respaldo para PNG/WebP o cuando el header JPEG no se pudo leer.
  const { img, ancho, alto } = await cargarComoImagen(file);
  const escala = Math.min(1, maxDim / Math.max(ancho, alto));
  return dibujarAjpeg(
    img,
    Math.round(ancho * escala),
    Math.round(alto * escala),
    name,
    quality
  );
};

// Indica si el archivo es un JPEG de cámara (formato real con el que fallaba
// el móvil) y si el navegador soporta decodificación con resize.
const esJpegRedimensionable = async (file) => {
  if (
    typeof createImageBitmap !== "function" ||
    typeof file.arrayBuffer !== "function"
  ) {
    return false;
  }
  try {
    const cabecera = new DataView(await file.slice(0, 2).arrayBuffer());
    return cabecera.getUint16(0) === 0xffd8;
  } catch {
    return false;
  }
};

const comprimirConFallback = async (file, options, maxDim) => {
  if (file.size <= 150 * 1024) return file;

  // 1) Baja memoria PRIORITARIO: JPEG se decodifica YA a la dimensión final.
  //    Nunca materializa el bitmap de resolución completa (~192MB) que tumba
  //    y deja sin memoria el renderer del celular para intentos posteriores.
  if (await esJpegRedimensionable(file)) {
    try {
      return await redimensionarManual(file, maxDim, options.initialQuality);
    } catch (err) {
      console.warn("[compressImage] ruta de baja memoria falló:", err);
    }
  }

  // 2) Lib oficial (maneja EXIF de forma explícita y formatos no JPEG).
  try {
    const comprimida = await imageCompression(file, options);
    if (comprimida && comprimida.size <= MAX_SAFE_OUTPUT) return comprimida;
    if (comprimida) {
      console.warn(
        "[compressImage] output demasiado grande, se intenta recorte manual:",
        comprimida.size
      );
    }
  } catch (err) {
    console.warn("[compressImage] browser-image-compression falló:", err);
  }

  // 3) Recorte manual genérico como red de seguridad.
  try {
    return await redimensionarManual(file, maxDim, options.initialQuality);
  } catch (err) {
    console.warn("[compressImage] recorte manual falló:", err);
  }

  // 4) Sin otra salida: el original si entra en el bucket.
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