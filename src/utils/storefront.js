const BASE = (
  import.meta.env.VITE_STORE_URL || "https://rengavstore.vercel.app"
).replace(/\/+$/, "");

export const STOREFRONT_URL = BASE;

export const getStoreUrl = (slug) => (slug ? `${BASE}/${slug}` : null);