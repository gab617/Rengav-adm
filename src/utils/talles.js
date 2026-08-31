/**
 * Helpers compartidos de talles (admin + POS + carrito).
 * Regla de negocio: si un producto tiene talles, su stock es POR TALLE
 * (user_products.stock_talles, clave = nombre del talle). Sin desglose,
 * un talle no tiene stock. El stock general solo aplica a productos
 * sin talles.
 */

// Stock disponible de un talle (o stock general si el producto no tiene talles).
export const stockDelTalle = (producto, talle) => {
  const tieneTalles = (producto?.products_base?.talles || []).length > 0;
  if (talle && tieneTalles) {
    return Number(producto?.stock_talles?.[talle]) || 0;
  }
  return Number(producto?.stock) || 0;
};

// Reparte un stock general entre los talles de un producto:
// partes iguales y el resto va al primer talle (no se pierde stock).
// `talles` = [{ id, name }] en el orden del catálogo.
export const repartirStockEntreTalles = (stock, talles = []) => {
  const total = Number(stock) || 0;
  if (!talles.length || total <= 0) return {};
  const n = talles.length;
  const porTalle = Math.floor(total / n);
  const resto = total - porTalle * n;
  const repartido = {};
  talles.forEach((t, i) => {
    repartido[t.name] = i === 0 ? porTalle + resto : porTalle;
  });
  return repartido;
};
