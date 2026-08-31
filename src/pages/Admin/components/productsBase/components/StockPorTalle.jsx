import React from "react";

/**
 * Inputs de stock por talle.
 * `value` es un objeto clave = nombre del talle (igual que
 * user_products.stock_talles). Los valores vacíos = 0 al guardar.
 */
export function StockPorTalle({ sizes = [], value = {}, onChange, dark = false, disabled = false }) {
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const inputBg = dark ? "bg-gray-700 text-white" : "bg-gray-50";

  if (!sizes.length) return null;

  return (
    <div className="mt-2">
      <label className={`block text-[10px] mb-1 ${textSecondary}`}>
        📏 Stock por talle
      </label>
      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-0.5">
            <span className={`text-[10px] font-medium ${textSecondary}`}>{s.name}</span>
            <input
              type="number"
              min="0"
              value={value[s.name] ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                onChange({ ...value, [s.name]: n });
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-14 p-1 rounded border text-xs text-center ${inputBg} ${
                dark ? "border-gray-600" : "border-gray-200"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function stockTallesToPayload(perSize, { force = false } = {}) {
  if (!perSize || Object.keys(perSize).length === 0) return null;
  const stockTalles = {};
  Object.entries(perSize).forEach(([name, v]) => {
    stockTalles[name] = Number(v) || 0;
  });
  if (!force && Object.values(stockTalles).every((x) => x === 0)) return null;
  return stockTalles;
}

export function sumStockTalles(perSize) {
  if (!perSize) return 0;
  return Object.values(perSize).reduce((acc, v) => acc + (Number(v) || 0), 0);
}
