import React from "react";

export function SizeSelector({ sizes = [], selected = [], onChange, dark = false, disabled = false }) {
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";

  if (!sizes.length) {
    return (
      <p className={`text-xs ${textSecondary}`}>
        Esta categoría no tiene talles configurados.
        {!disabled && " El super admin puede configurarlos en el panel de talles."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((s) => {
        const active = selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(active ? selected.filter((x) => x !== s.id) : [...selected, s.id])
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active
                ? "bg-blue-500 text-white shadow"
                : dark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
