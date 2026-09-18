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

  // createImageBitmap con resize decodifica a resolución completa y recién
  // después escala (verificado en ImageBitmap.cpp de Chromium). Este camino
  // NO ahorra memoria; queda solo como red de seguridad de formato.
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

// Camino VERDADERO de baja memoria (Chromium): WebCodecs ImageDecoder con
// desiredWidth/desiredHeight redimensiona DURANTE el decode del JPEG
// (JPEGImageDecoder::DesiredScaleNumerator). Nunca materializa el bitmap de
// resolución completa (~192MB), que es lo que tira el renderer del celular.
// Disponible en Chrome 94+ (escritorio y Android); devuelve null si no aplica.
const decodificarJpegReducido = async (file, dims, maxDim, quality) => {
  if (typeof ImageDecoder === "undefined") return null;

  const soportado = await ImageDecoder.isTypeSupported(
    file.type || "image/jpeg"
  );
  if (!soportado) return null;

  const escala = Math.min(1, maxDim / Math.max(dims.ancho, dims.alto));
  const target = {
    ancho: Math.max(1, Math.round(dims.ancho * escala)),
    alto: Math.max(1, Math.round(dims.alto * escala)),
  };

  const buffer = await file.arrayBuffer();
  const decoder = new ImageDecoder({
    type: file.type || "image/jpeg",
    data: buffer,
    desiredWidth: target.ancho,
    desiredHeight: target.alto,
  });

  try {
    const { image } = await decoder.decode();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = target.ancho;
      canvas.height = target.alto;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
      if (!blob) throw new Error("El canvas no pudo generar el JPEG");

      const name = file.name.replace(/\.[^.$]+$/, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg" });
    } finally {
      image.close?.();
    }
  } finally {
    decoder.close?.();
  }
};

const comprimirConFallback = async (file, options, maxDim) => {
  if (file.size <= 150 * 1024) return file;

  const razones = [];

  // 1) Reduce el JPEG DURANTE el decode (WebCodecs, solo Chromium). Es la
  //    única ruta que no pide el bitmap completo de memoria al móvil.
  const dims = await leerDimensionesJpeg(file);
  if (dims) {
    try {
      const reducida = await decodificarJpegReducido(
        file,
        dims,
        maxDim,
        options.initialQuality
      );
      if (reducida) return reducida;
      razones.push(
        typeof ImageDecoder === "undefined"
          ? "WebCodecs no disponible"
          : "ImageDecoder no aplicó la ruta reducida"
      );
    } catch (err) {
      razones.push(`ImageDecoder: ${err?.name || err?.message || err}`);
      console.warn("[compressImage] ImageDecoder falló:", err);
    }
  } else {
    razones.push("no es un JPEG simple");
  }

  // 2) Lib oficial (maneja EXIF de forma explícita y formatos no JPEG).
  try {
    const comprimida = await imageCompression(file, options);
    if (comprimida && comprimida.size <= MAX_SAFE_OUTPUT) return comprimida;
    razones.push(
      comprimida
        ? `browser-image-compression dio ${Math.round(comprimida.size / 1024)} KB`
        : "browser-image-compression devolvió null"
    );
  } catch (err) {
    razones.push(
      `browser-image-compression: ${err?.name || err?.message || err}`
    );
    console.warn("[compressImage] browser-image-compression falló:", err);
  }

  // 3) Recorte manual genérico como red de seguridad.
  try {
    return await redimensionarManual(file, maxDim, options.initialQuality);
  } catch (err) {
    razones.push(`recorte manual: ${err?.name || err?.message || err}`);
    console.warn("[compressImage] recorte manual falló:", err);
  }

  // 4) Sin otra salida: el original si entra en el bucket.
  if (file.size <= MAX_BUCKET_SIZE) {
    return file;
  }

  throw new Error(
    `No se pudo comprimir (${razones.join(" | ")}; original ${Math.round(
      file.size / 1024
    )} KB supera los ${(MAX_BUCKET_SIZE / 1024 / 1024).toFixed(0)} MB)`
  );
};

// Los celulares muestran un cold-start determinístico: el PRIMER intento de
// compresión de una selección falla (decodificador frío, memoria del renderer
// recién asignada) y el segundo funciona siempre. Un único reintento convierte
// ese primer archivo en un "intento 2" que ya sabemos que suele ganar.
const comprimirConReintento = async (file, options, maxDim) => {
  try {
    return await comprimirConFallback(file, options, maxDim);
  } catch (primerError) {
    console.warn(
      "[compressImage] el primer intento de compresión falló; se reintenta:",
      primerError.message
    );
    // Pausa breve para dejar que el GC libere lo del primer intento.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return comprimirConFallback(file, options, maxDim);
  }
};

export const compressImage = async (file) =>
  comprimirConReintento(file, PRODUCT_OPTIONS, 1200);

export const compressBrandingImage = async (file) =>
  comprimirConReintento(file, BRANDING_OPTIONS, 800);