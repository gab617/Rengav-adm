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

// Los archivos del selector de Android son content:// y Chrome los lee de
// forma INTERMITENTE (NotReadableError: "could not be read due to permission
// problems").

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Caché en memoria de archivos YA leídos, por huella (nombre+tamaño+última
// modificación). En Android, re-pickear la misma foto reabre el content://
// y Chromium filtran file descriptors: tras varios agrega/elimina el sistema
// no puede abrir más y TODA lectura falla. Si la foto ya se leyó antes,
// reusamos el buffer en RAM y ni tocamos el content://.
// ACOTADA a la cantidad máxima de imágenes (3) y con liberación explícita al
// eliminar (ver liberarCacheLectura): los buffers originales pesan ~6.7MB c/u
// y retenerlos indefinidamente mata al móvil por RAM, no por FDs.
const CACHE_LECTURAS = new Map();
const MAX_CACHE_LECTURAS = 3;

const huellaArchivo = (file) =>
  `${file.name}|${file.size}|${file.lastModified}`;

// El editor guarda esta huella junto al path subido para poder liberar el
// buffer exacto cuando el usuario elimina esa imagen (ver liberarCacheLectura).
export const guardarHuella = (file) => huellaArchivo(file);

const cachearLectura = (file, buffer) => {
  const huella = huellaArchivo(file);
  if (CACHE_LECTURAS.has(huella)) return;
  if (CACHE_LECTURAS.size >= MAX_CACHE_LECTURAS) {
    const masVieja = CACHE_LECTURAS.keys().next().value;
    CACHE_LECTURAS.delete(masVieja);
  }
  CACHE_LECTURAS.set(huella, buffer);
};

// Libera del caché el buffer de una foto puntual. La usa el editor cuando el
// usuario ELIMINA una imagen: si quedara retenido, estaríamos ocupando ~6.7MB
// de RAM en el celular por una foto que ya nadie va a reutilizar.
export const liberarCacheLectura = (huella) => {
  if (!huella) return false;
  return CACHE_LECTURAS.delete(huella);
};

// ============================================================================
// CACHÉ PERSISTENTE EN DISCO (IndexedDB)
// ----------------------------------------------------------------------------
// Guarda el resultado COMPRIMIDO (~0.5MB) keyed por huella, NO el original de
// 6.7MB. Sobrevive a recargar/cerrar la pestaña (a diferencia de la RAM), con
// lo que re-pickear la misma foto NO vuelve a tocar el content:// (Android) ni
// a re-leer de iCloud (iPhone). Es un CACHÉ, no un backup: max 30 entradas,
// desalojo FIFO por fecha de inserción (no se toca el timestamp en el read;
// con cap de 30 la diferencia con un LRU real es despreciable), y si
// IndexedDB falla o no existe, degrada al comportamiento actual sin romper
// nada.
// ============================================================================
const IDB_NOMBRE = "comercio-compresion";
const IDB_STORE = "comprimidas";
const MAX_CACHE_IDB = 30;

let idbPromise = null;

const abrirIdb = () => {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(IDB_NOMBRE, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
};

const listarIdb = async (db) => {
  const tx = db.transaction(IDB_STORE, "readonly");
  const store = tx.objectStore(IDB_STORE);
  const req = store.openCursor();
  const entradas = [];
  await new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        entradas.push({ key: cursor.key, ts: cursor.value?.ts || 0 });
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
  return entradas;
};

const desalojarIdb = async (db) => {
  const entradas = await listarIdb(db);
  if (entradas.length <= MAX_CACHE_IDB) return;
  const ordenadas = [...entradas].sort((a, b) => a.ts - b.ts);
  const sobrantes = ordenadas.slice(0, entradas.length - MAX_CACHE_IDB);
  if (!sobrantes.length) return;

  const tx = db.transaction(IDB_STORE, "readwrite");
  const store = tx.objectStore(IDB_STORE);
  for (const e of sobrantes) store.delete(e.key);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
};

const guardarComprimidaEnIdb = async (huella, file) => {
  try {
    const db = await abrirIdb();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.put({ file, ts: Date.now() }, huella);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await desalojarIdb(db);
  } catch (err) {
    console.warn("[compressImage] no se pudo cachear en disco:", err);
  }
};

const leerComprimidaDeIdb = async (huella) => {
  try {
    const db = await abrirIdb();
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(huella);
    const value = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return value?.file || null;
  } catch (err) {
    console.warn("[compressImage] no se pudo leer caché de disco:", err);
    return null;
  }
};

// Serializa errores de forma legible (los ProgressEvent/Event de la lib
// aparecen como "[object X]" y ocultan el dato importante).
const describirError = (err) => {
  if (!err) return "desconocido";
  if (typeof err === "string") return err;
  const msg = err?.message;
  if (msg && typeof msg === "string" && msg.length) return msg;
  if (err?.loaded !== undefined && err?.total !== undefined) {
    return `${err?.type || "Leer archivo"}: ${err.loaded}/${err.total} bytes`;
  }
  return err?.type || err?.name || String(err);
};

// Lee el archivo COMPLETO UNA vez, probando varias estrategias hasta que una
// funcione. En Android, la lectura de un content:// seleccionado SOLO falla
// intermitentemente (en lote funciona porque Android materializa las copias):
// 1) clonar el File (bug 1063576: fuerza materializar al storage de Chromium)
// 2) sonda de cabezal + arrayBuffer
// 3) arrayBuffer() completo  4) stream() por chunks  5) fetch() sobre blob URL.
// Todas las rutas de compresión reusan el buffer en memoria, así ninguna
// vuelve a tocar el content:// que es lo que falla.
const leerArchivo = async (file) => {
  const cacheado = CACHE_LECTURAS.get(huellaArchivo(file));
  if (cacheado) {
    console.debug("[compressImage] reusando buffer cacheado (sin tocar content://)");
    return cacheado;
  }

  const t0 = performance.now();
  const estrategias = [
    // Workaround documentado del bug chromium 1063576: clonar el File en un
    // File/Blob NUEVO antes de leer fuerza a Chromium a copiar el contenido
    // a su propio storage, dejando de depender del content:// (que en Android
    // llega como placeholder temporal no materializado).
    async () => {
      const clon = new File([file], file.name, {
        type: file.type,
        lastModified: file.lastModified,
      });
      return clon.arrayBuffer();
    },
    // "Sonda de cabezal": el provide del content:// recién elegido a veces
    // responde tras leer un trozo CHICO primero (despierta la materialización).
    async () => {
      await file.slice(0, Math.min(file.size, 64 * 1024)).arrayBuffer();
      return file.arrayBuffer();
    },
    () => file.arrayBuffer(),
    async () => {
      const lector = file.stream().getReader();
      const trozos = [];
      let total = 0;
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        trozos.push(value);
        total += value.byteLength;
      }
      const union = new Uint8Array(total);
      let offset = 0;
      for (const t of trozos) {
        union.set(t, offset);
        offset += t.byteLength;
      }
      return union.buffer;
    },
    async () => {
      const url = URL.createObjectURL(file);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.arrayBuffer();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  ];

  let ultimoError = null;
  for (const estrategia of estrategias) {
    for (let intento = 1; intento <= 3; intento += 1) {
      try {
        const buffer = await estrategia();
        cachearLectura(file, buffer);
        return buffer;
      } catch (err) {
        ultimoError = err;
        console.warn(
          `[compressImage] estrategia de lectura falló (intento ${intento}):`,
          err
        );
        if (intento < 3) await esperar(500 * intento);
      }
    }
  }
  console.debug(
    `[compressImage] lectura falló tras ${Math.round(
      performance.now() - t0
    )}ms (huella ${huellaArchivo(file)})`
  );
  throw ultimoError;
};

// Escanea el buffer en busca del marcador SOF (ancho/alto del JPEG). Las
// fotos de celular suelen tener EXIF enorme (GPS + thumbnail): el SOF
// principal aparece MUY después del inicio, por eso se recorre todo el buffer.
// Devuelve { esJpeg, dims } (dims = null si el SOF no aparece).
const analizarJpeg = (buffer) => {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return { esJpeg: false, dims: null };

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) return { esJpeg: true, dims: null };
      const marker = view.getUint8(offset + 1);
      const isSof =
        (marker >= 0xc0 && marker <= 0xcf) &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof) {
        const alto = view.getUint16(offset + 5);
        const ancho = view.getUint16(offset + 7);
        return { esJpeg: true, dims: { ancho, alto } };
      }
      const len = view.getUint16(offset + 2);
      if (len < 2) return { esJpeg: true, dims: null };
      offset += 2 + len;
    }
    return { esJpeg: true, dims: null };
  } catch {
    return { esJpeg: false, dims: null };
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
// `dims` puede ser null: en ese caso las dimensiones se toman de la metadata
// del track del decoder (funciona para EXIF gigante o SOF fuera del rango).
const decodificarJpegReducido = async (buffer, tipo, dims, maxDim, quality) => {
  if (typeof ImageDecoder === "undefined") return null;

  const soportado = await ImageDecoder.isTypeSupported(tipo);
  if (!soportado) return null;

  const decodificar = async (target) => {
    const decoder = new ImageDecoder({
      type: tipo,
      data: buffer,
      ...(target
        ? { desiredWidth: target.ancho, desiredHeight: target.alto }
        : {}),
    });

    try {
      const { image } = await decoder.decode();
      try {
        const canvas = document.createElement("canvas");
        canvas.width =
          target?.ancho || image.displayWidth || image.codedWidth || 1;
        canvas.height =
          target?.alto || image.displayHeight || image.codedHeight || 1;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality)
        );
        if (!blob) throw new Error("El canvas no pudo generar el JPEG");

        return blob;
      } finally {
        image.close?.();
      }
    } finally {
      decoder.close?.();
    }
  };

  const calcularTarget = (d) => {
    const escala = Math.min(1, maxDim / Math.max(d.ancho, d.alto));
    return {
      ancho: Math.max(1, Math.round(d.ancho * escala)),
      alto: Math.max(1, Math.round(d.alto * escala)),
    };
  };

  // 1) Si tenemos dims del buffer, es el caso directo.
  if (dims?.ancho && dims?.alto) {
    return decodificar(calcularTarget(dims));
  }

  // 2) Sin dims: preguntamos la metadata al decoder SIN decodificar todo.
  const probe = new ImageDecoder({ type: tipo, data: buffer });
  let reales = null;
  try {
    const track = probe.tracks?.[0] || probe.tracks?.selectedTrack;
    const info = track?.imageInfo;
    if (info) {
      reales = {
        ancho: info.displayWidth || info.codedWidth,
        alto: info.displayHeight || info.codedHeight,
      };
    }
  } finally {
    probe.close?.();
  }

  if (!reales?.ancho || !reales?.alto) return null;
  return decodificar(calcularTarget(reales));
};

const comprimirConFallback = async (file, options, maxDim) => {
  // Imágenes chicas que ya entran al bucket: NO tocan el lector de archivos
  // ni la compresión, se suben tal cual (el bucket soporta hasta 5MB). Esto
  // evita el NotReadableError del content:// para archivos que no lo necesitan.
  if (file.size <= 1024 * 1024) return file;

  const razones = [];

  // CAUSA RAÍZ: Chrome/Android lee los content:// del selector de forma
  // intermitente. Antes cada ruta re-leía el archivo (header, ImageDecoder,
  // lib, manual) y cualquier intento podía fallar. Ahora leemos UNA vez, en
  // memoria, y todas las rutas reusan el mismo buffer.
  let buffer;
  try {
    buffer = await leerArchivo(file);
  } catch (err) {
    console.warn("[compressImage] no se pudo leer el archivo:", err);
    const pista =
      eresIos && /i\/O|I\/O|permission|permis/i.test(describirError(err))
        ? " Si la foto está en iCloud sin descargar, abrí la app Fotos, tocá la imagen para descargarla y volvé a elegirla."
        : " Volvé a elegir la foto e intentá de nuevo.";
    throw new Error(
      `No se pudo leer el archivo desde el selector (${describirError(err)}).` + pista
    );
  }

  const tipo = file.type || "image/jpeg";
  // File en memoria: las rutas siguientes (lib, manual) ya no tocan el
  // content://, leen de memoria pura.
  const archivoSeguro = new File([buffer], file.name, { type: tipo });

  // 1) Reduce el JPEG DURANTE el decode (WebCodecs, solo Chromium). Es la
  //    única ruta que no pide el bitmap completo de memoria al móvil.
  const { esJpeg, dims } = analizarJpeg(buffer);
  if (typeof ImageDecoder !== "undefined") {
    try {
      const blob = await decodificarJpegReducido(
        buffer,
        tipo,
        dims,
        maxDim,
        options.initialQuality
      );
      if (blob) {
        const name = file.name.replace(/\.[^.$]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg" });
      }
      razones.push(
        esJpeg
          ? "ImageDecoder no aplicó la ruta reducida"
          : "no es un JPEG simple"
      );
    } catch (err) {
      razones.push(`ImageDecoder: ${describirError(err)}`);
      console.warn("[compressImage] ImageDecoder falló:", err);
    }
  } else {
    razones.push("WebCodecs no disponible");
  }

  // 2) Lib oficial (maneja EXIF de forma explícita y formatos no JPEG).
  try {
    const comprimida = await imageCompression(archivoSeguro, options);
    if (comprimida && comprimida.size <= MAX_SAFE_OUTPUT) return comprimida;
    razones.push(
      comprimida
        ? `browser-image-compression dio ${Math.round(comprimida.size / 1024)} KB`
        : "browser-image-compression devolvió null"
    );
  } catch (err) {
    razones.push(`browser-image-compression: ${describirError(err)}`);
    console.warn("[compressImage] browser-image-compression falló:", err);
  }

  // 3) Recorte manual genérico como red de seguridad.
  try {
    return await redimensionarManual(archivoSeguro, maxDim, options.initialQuality);
  } catch (err) {
    razones.push(`recorte manual: ${describirError(err)}`);
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

const eresIos =
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

// La lectura de archivos del selector puede fallar TRANSITORIAMENTE (Android
// content:// intermitente): 3 tiradas de la compresión completa con backoff
// creciente, pero SOLO si el error fue de lectura (fresh dice al content://).
// Si el archivo SÍ se leyó y falló la compresión, es un problema real: no se
// reintenta, se eleva de una.
const esErrorDeLectura = (err) =>
  typeof err?.message === "string" &&
  err.message.startsWith("No se pudo leer el archivo desde el selector");

const comprimirConReintento = async (file, options, maxDim) => {
  const INTENTOS = 3;
  let ultimoError = null;
  for (let intento = 1; intento <= INTENTOS; intento += 1) {
    try {
      return await comprimirConFallback(file, options, maxDim);
    } catch (err) {
      ultimoError = err;
      if (!esErrorDeLectura(err)) throw err;
      console.warn(
        `[compressImage] reintento de lectura ${intento}/${INTENTOS}:`,
        err.message
      );
      if (intento < INTENTOS) await esperar(500 * intento);
    }
  }
  throw ultimoError;
};

// Key de caché en disco: huella del archivo + variante de compresión. La
// variante importa porque producto (1200px) y branding (800px) comprimen la
// MISMA foto distinto y no deben pisarse.
const huellaCacheIdb = (file, variante) => `${huellaArchivo(file)}|${variante}`;

export const compressImage = async (file) => {
  if (file.size <= 1024 * 1024) return file;

  const huella = huellaCacheIdb(file, "producto");
  const cacheada = await leerComprimidaDeIdb(huella);
  if (cacheada) return cacheada;

  const resultado = await comprimirConReintento(file, PRODUCT_OPTIONS, 1200);
  if (resultado !== file) await guardarComprimidaEnIdb(huella, resultado);
  return resultado;
};

export const compressBrandingImage = async (file) => {
  if (file.size <= 1024 * 1024) return file;

  const huella = huellaCacheIdb(file, "branding");
  const cacheada = await leerComprimidaDeIdb(huella);
  if (cacheada) return cacheada;

  const resultado = await comprimirConReintento(file, BRANDING_OPTIONS, 800);
  if (resultado !== file) await guardarComprimidaEnIdb(huella, resultado);
  return resultado;
};