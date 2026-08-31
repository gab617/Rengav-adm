import { useSizesContext } from "../../../contexto/SizesContext";

/**
 * Catálogo global de talles + asignación por categoría.
 * Consume del SizesContext (fetch único global).
 */
export function useSizes() {
  const { sizes, categorySizes, loading, getSizesByCategory, getProductSizes } = useSizesContext();
  return { sizes, categorySizes, loading, getSizesByCategory, getProductSizes };
}
