import { CUSTOM_LABEL, PALETTES } from "./themeData";

export function GroupCard({ title, children, onRestore, restoring }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {onRestore && (
          <button
            type="button"
            onClick={onRestore}
            disabled={restoring}
            className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
          >
            Restaurar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function ColorField({ label, value, base, onChange }) {
  const isOverride = !!value && value !== base;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`h-8 w-10 rounded-lg border shrink-0 ${
              isOverride ? "border-blue-400" : "border-gray-200"
            }`}
            style={{ background: value || "#ffffff" }}
            title={value || "Heredando"}
          />
          <label className="text-sm text-gray-700 truncate">{label}</label>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto sm:justify-end">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Heredar"
            className="min-w-0 flex-1 sm:flex-none sm:w-20 text-sm font-mono border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            title="Elegir color"
            className="h-9 w-11 cursor-pointer rounded border border-gray-200 bg-transparent"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            title="Heredar del negocio"
            className="h-9 px-2.5 rounded-md text-sm text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      </div>

      {isOverride ? (
        <p className="mt-1 text-[11px] font-medium text-blue-600">
          {CUSTOM_LABEL}
        </p>
      ) : base ? (
        <p className="mt-1 text-[11px] text-gray-400">
          {value
            ? "Hereda del negocio"
            : `Hereda del negocio · ${base}`}
        </p>
      ) : null}
    </div>
  );
}

function optionLabel(options, value) {
  const o = options.find((x) => x.value === value);
  return o ? o.label : value;
}

function InheritHint({ base, options, value, prefix }) {
  if (value && value !== base) {
    return (
      <p className="mt-1 text-[11px] font-medium text-blue-600">
        {CUSTOM_LABEL}
      </p>
    );
  }
  if (base) {
    return (
      <p className="mt-1 text-[11px] text-gray-400">
        {prefix} «{optionLabel(options, base)}»
      </p>
    );
  }
  return null;
}

export function TokenSelect({ label, options, value, base, onChange }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.value || `_${o.label}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <InheritHint base={base} options={options} value={value} prefix="El negocio usa" />
    </label>
  );
}

export function FontPicker({ label, options, value, base, onChange }) {
  return (
    <div>
      <span className="text-sm text-gray-700">{label}</span>
      <div className="mt-1.5 space-y-1.5">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value || "_inherit"}
              type="button"
              onClick={() => onChange(o.value)}
              title={o.label}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                selected
                  ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <span
                className="block text-base font-medium leading-snug truncate"
                style={{ fontFamily: o.value || undefined }}
              >
                {o.label}
              </span>
              <span
                className="block text-[11px] text-gray-400 mt-0.5 truncate"
                style={{ fontFamily: o.value || undefined }}
              >
                Aa Bb Cc 123 — Pan casero y medialunas
              </span>
            </button>
          );
        })}
      </div>
      <InheritHint base={base} options={options} value={value} prefix="El negocio usa" />
    </div>
  );
}

export function PalettePicker({ onApply }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 mb-2">
        Paletas predefinidas
      </p>

      {[
        { tema: "claro", label: "Claras" },
        { tema: "intermedio", label: "Intermedias" },
        { tema: "oscuro", label: "Oscuras" },
      ].map((grupo) => {
        const paletas = PALETTES.filter((p) => p.tema === grupo.tema);
        if (!paletas.length) return null;
        return (
          <div key={grupo.tema} className="mb-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1.5">
              {grupo.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {paletas.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onApply(p)}
                  title={`Aplicar paleta ${p.name}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-xs font-medium text-gray-700">
                    {p.name}
                  </span>
                  <span className="flex -space-x-1">
                    {Object.values(p.colors)
                      .slice(0, 5)
                      .map((c, i) => (
                        <span
                          key={i}
                          className="h-4 w-4 rounded-full border border-white"
                          style={{ background: c }}
                        />
                      ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 mt-2">
        Al tocar una paleta se aplican esos colores al formulario. No se guarda
        hasta tocar «Guardar estilo».
      </p>
    </div>
  );
}

const FIT_OPTIONS = [
  { value: "", label: "Heredar" },
  { value: "cover", label: "Cubrir" },
  { value: "contain", label: "Entrera" },
  { value: "fill", label: "Estirar" },
  { value: "none", label: "Natural" },
];

const ZOOM_OPTIONS = [
  { value: "", label: "Heredar" },
  { value: "0.5", label: "0.5x" },
  { value: "0.75", label: "0.75x" },
  { value: "1", label: "1x" },
  { value: "1.25", label: "1.25x" },
  { value: "1.5", label: "1.5x" },
  { value: "1.75", label: "1.75x" },
  { value: "2", label: "2x" },
];

const POSITION_OPTIONS = [
  { value: "", label: "Heredar" },
  { value: "center", label: "⦿ Centro" },
  { value: "top", label: "↑ Arriba" },
  { value: "bottom", label: "↓ Abajo" },
  { value: "left", label: "← Izquierda" },
  { value: "right", label: "→ Derecha" },
];

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value || "_inherit"}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === o.value
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ImageLookEditor({ title, fit, zoom, position, onChange }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 space-y-3">
      <p className="text-sm font-medium text-gray-800">{title}</p>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Ajuste</p>
        <Segmented
          options={FIT_OPTIONS}
          value={fit.value}
          onChange={(v) => onChange(fit.key, v)}
        />
        <InheritHint base={fit.base} options={FIT_OPTIONS} value={fit.value} prefix="El negocio usa" />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Zoom</p>
        <Segmented
          options={ZOOM_OPTIONS}
          value={zoom.value}
          onChange={(v) => onChange(zoom.key, v)}
        />
        <InheritHint base={zoom.base} options={ZOOM_OPTIONS} value={zoom.value} prefix="El negocio usa" />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Posición del recorte</p>
        <Segmented
          options={POSITION_OPTIONS}
          value={position.value}
          onChange={(v) => onChange(position.key, v)}
        />
        <InheritHint base={position.base} options={POSITION_OPTIONS} value={position.value} prefix="El negocio usa" />
      </div>

      <p className="text-[11px] text-gray-400">
        El ajuste usa la misma regla de herencia que los colores: un valor
        vacío hereda lo configurado en el negocio.
      </p>

      <p className="text-[11px] text-gray-400">
        Tip: en la vista previa podés arrastrar la portada (hero) para
        acomodar la posición del encuadre.
      </p>
    </div>
  );
}