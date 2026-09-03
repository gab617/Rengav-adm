const quickOptions = [
  { label: "50", value: 0.05 },
  { label: "100", value: 0.1 },
  { label: "500", value: 0.5 },
  { label: "1k", value: 1 },
];

const formatWeight = (nums) => {
  if (!nums) return "";

  const padded = nums.padStart(4, "0");
  const int = padded.slice(0, -3);
  const dec = padded.slice(-3);

  return `${Number(int)}.${dec}`;
};

export function Balanza({ dark, peso, onChange }) {
  const grams = peso !== null && peso !== undefined ? Math.round(peso * 1000) : null;

  const updateWeight = (gramsValue) => {
    if (!gramsValue) {
      onChange?.(null);
      return;
    }

    onChange?.(gramsValue / 1000);
  };

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    updateWeight(Number(value));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      if (!grams) {
        return;
      }

      const newDigits = String(grams).slice(0, -1);

      if (!newDigits) {
        onChange?.(null);
        return;
      }

      onChange?.(Number(newDigits) / 1000);
    }
  };

  const handleBalanzaClick = () => {
    onChange?.(null);
  };

  const addWeight = (value) => {
    const current = Number(grams || 0);
    const add = Math.round(value * 1000);
    const total = current + add;

    updateWeight(total);
  };

  const displayValue = grams !== null ? formatWeight(String(grams)) : "";

  return (
    <div className="flex items-center gap-1">
      <div
        className={`flex items-center gap-0.5 rounded-md border px-0.5 py-[2px] ${
          dark ? "border-white/10 bg-black/20" : "border-gray-300 bg-white/70"
        }`}
      >
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="kg"
          className={`
          w-11 text-xs px-1 py-[1px] rounded border text-center transition
          ${
            dark
              ? "bg-black/40 border-white/20 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
              : "bg-white border-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          }
          focus:outline-none
        `}
        />

        {quickOptions.map((b) => (
          <button
            key={b.label}
            onClick={() => addWeight(b.value)}
            title={`Agregar ${b.value >= 1 ? "1 kg" : b.value * 1000 + "g"}`}
            className={`
            text-[10px] leading-none font-medium px-1 py-1
            rounded border shadow-sm
            transition-all duration-150
            active:scale-95
            ${
              dark
                ? "border-white/20 bg-white/10 hover:bg-yellow-400/20"
                : "border-gray-400 bg-white hover:bg-yellow-100"
            }
          `}
          >
            {b.label}
          </button>
        ))}
      </div>

      <img
        onClick={handleBalanzaClick}
        className="cursor-pointer w-7 h-7 rounded-md shadow-sm ring-1 ring-yellow-400/70 bg-yellow-50
        hover:shadow-md hover:scale-105
        transition-all duration-200 shrink-0"
        src="/balanza.png"
        alt="Venta por peso"
        title="Limpiar peso"
      />
    </div>
  );
}
