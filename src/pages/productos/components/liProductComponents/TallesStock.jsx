import React from "react";

/**
 * Chips de stock por talle para las cards.
 * `sizes`: [{ id, name, sort_order }] (ya resueltos y ordenados).
 * `stockTalles`: objeto { nombreTalle: stock } (user_products.stock_talles).
 * Con `repartido` los chips se reparten el ancho de la card (mosaico);
 * sin él se acomodan compactos (listado).
 */
export function TallesStock({ sizes = [], stockTalles = {}, dark = false, repartido = false }) {
  if (!sizes.length) return null;

  const colorCls = (stock) =>
    stock === 0
      ? "text-red-500"
      : stock <= 5
        ? "text-amber-500"
        : dark
          ? "text-green-400"
          : "text-green-700";

  // MOSAICO: chips que se reparten el ancho de la card.
  if (repartido) {
    return (
      <div className="flex flex-wrap gap-1 w-full">
        {sizes.map((s) => {
          const stock = Number(stockTalles[s.name]) || 0;
          return (
            <span
              key={s.id}
              className={`flex-1 min-w-[2.25rem] rounded border px-1 py-0.5 text-center text-[10px] sm:text-xs ${
                dark ? "border-gray-600 bg-gray-800" : "border-gray-300 bg-gray-50"
              }`}
            >
              <span className={`font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {s.name}:
              </span>{" "}
              <strong className={colorCls(stock)}>{stock}</strong>
            </span>
          );
        })}
      </div>
    );
  }

  // LISTADO: cada talle encerrado en su chip con borde por estado,
  // respetando el theme y con buen contraste (sin w-full → no deforma la fila).
  return (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((s) => {
        const stock = Number(stockTalles[s.name]) || 0;
        const agotado = stock === 0;
        const bajo = !agotado && stock <= 5;

        const textColor = agotado
          ? "text-red-500"
          : bajo
            ? "text-amber-500"
            : dark
              ? "text-green-400"
              : "text-green-700";

        const borderColor = agotado
          ? dark
            ? "border-red-500/60"
            : "border-red-400"
          : bajo
            ? dark
              ? "border-amber-500/60"
              : "border-amber-400"
            : dark
              ? "border-green-500/50"
              : "border-green-400";

        return (
          <span
            key={s.id}
            className={`inline-flex items-baseline gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-none whitespace-nowrap ${
              dark ? "bg-gray-800" : "bg-gray-100"
            } ${borderColor}`}
          >
            <span
              className={`font-semibold ${
                dark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {s.name}
            </span>
            <strong className={`${textColor} tabular-nums`}>{stock}</strong>
          </span>
        );
      })}
    </div>
  );
}
