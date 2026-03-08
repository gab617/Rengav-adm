import { useState } from "react";

export function Balanza({ dark, onChange }) {
  const [digits, setDigits] = useState("");

  const quickOptions = [
    { label: "50g", value: 0.05 },
    { label: "100g", value: 0.1 },
    { label: "500g", value: 0.5 },
    { label: "1kg", value: 1 },
  ];

  const formatWeight = (nums) => {
    if (!nums) return "";

    const padded = nums.padStart(4, "0");
    const int = padded.slice(0, -3);
    const dec = padded.slice(-3);

    return `${Number(int)}.${dec}`;
  };

  const updateWeight = (grams) => {
    if (!grams) {
      setDigits("");
      onChange?.(null);
      return;
    }

    setDigits(String(grams));
    onChange?.(grams / 1000);
  };

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    updateWeight(Number(value));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      const newDigits = digits.slice(0, -1);

      if (!newDigits) {
        updateWeight(null);
        return;
      }

      updateWeight(Number(newDigits));
    }
  };

  const handleBalanzaClick = () => {
    updateWeight(null);
  };

  const addWeight = (value) => {
    const current = Number(digits || 0);
    const add = Math.round(value * 1000);
    const total = current + add;

    updateWeight(total);
  };

  const displayValue = formatWeight(digits);

  return (
    <div className="flex justify-end items-center gap-1">
      <div
        className={`flex items-center gap-1 rounded-md border
        ${dark ? "border-white/10 bg-black/20" : "border-gray-300 bg-white/70"}`}
      >
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="kg"
          className={`
          w-16 text-sm px-1 py-[2px] rounded border text-center transition
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
            className={`
            text-xs font-medium px-[.5em] py-[.3em]
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
        className="cursor-pointer w-[9%] sm:w-[10%] md:w-[20%] lg:w-[10%] xl:w-[9%]
        rounded-md shadow-md ring-2 ring-yellow-400/70 bg-yellow-50
        hover:shadow-lg hover:scale-105
        transition-all duration-200"
        src="./balanza.png"
        alt="Venta por peso"
      />
    </div>
  );
}