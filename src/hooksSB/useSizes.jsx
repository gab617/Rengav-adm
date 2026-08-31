import { useSizesContext } from "../contexto/SizesContext";

/**
 * Catálogo global de talles para el POS (/productos y carrito).
 * Consume del SizesContext (fetch único global).
 */
export const useSizes = () => {
  const { sizes, sizesById, getProductSizeNames, loading: loadingSizes } = useSizesContext();
  return { sizes, sizesById, getProductSizeNames, loadingSizes };
};
