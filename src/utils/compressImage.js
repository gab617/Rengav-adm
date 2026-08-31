import imageCompression from "browser-image-compression";

const PRODUCT_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  initialQuality: 0.82,
  useWebWorker: true,
};

const BRANDING_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 800,
  initialQuality: 0.90,
  useWebWorker: true,
};

export const compressImage = async (file) => {
  if (file.size <= 150 * 1024) return file;
  return imageCompression(file, PRODUCT_OPTIONS);
};

export const compressBrandingImage = (file) =>
  imageCompression(file, BRANDING_OPTIONS);
