const clamp = (n, max) => Math.max(1, Math.min(max, n));

export function StepperCantidad({ cantidad, max, onChange, dark }) {
  const handleChange = (e) => {
    const val = e.target.value.replace(/[^\d]/g, "");
    if (!val) {
      onChange(1);
      return;
    }
    onChange(clamp(Number(val), max));
  };

  const dec = () => onChange(clamp((cantidad || 1) - 1, max));
  const inc = () => onChange(clamp((cantidad || 1) + 1, max));

  const border = dark ? "border-white/15" : "border-gray-300";
  const btn = dark
    ? "hover:bg-gray-700 text-gray-200"
    : "hover:bg-gray-100 text-gray-700";
  const input = dark
    ? "bg-black/40 text-white border-white/15 focus:border-yellow-400"
    : "bg-white text-gray-900 border-gray-300 focus:border-yellow-500";

  return (
    <div className={`flex items-center rounded-lg border overflow-hidden ${border}`}>
      <button
        type="button"
        onClick={dec}
        disabled={cantidad <= 1}
        title="Restar"
        className={`w-8 h-8 shrink-0 flex items-center justify-center text-lg font-bold transition-colors ${btn} ${
          cantidad <= 1 ? "opacity-40 cursor-not-allowed" : ""
        }`}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={cantidad}
        onChange={handleChange}
        title={`Máximo: ${max}`}
        className={`w-11 h-8 text-center text-sm font-semibold outline-none border-x ${input}`}
      />
      <button
        type="button"
        onClick={inc}
        disabled={cantidad >= max}
        title="Sumar"
        className={`w-8 h-8 shrink-0 flex items-center justify-center text-lg font-bold transition-colors ${btn} ${
          cantidad >= max ? "opacity-40 cursor-not-allowed" : ""
        }`}
      >
        +
      </button>
    </div>
  );
}
