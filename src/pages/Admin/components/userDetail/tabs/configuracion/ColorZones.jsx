import { useState } from "react";
import { COLORS } from "./themeData";
import { ColorField } from "./themeControls";
import { contrastRatio } from "./themeContrast";

const DEFAULT_COLORS = {
  primary: "#2563EB",
  "primary-texto": "#FFFFFF",
  secondary: "#4B5563",
  accent: "#DB2777",
  fondo: "#F9FAFB",
  tarjeta: "#FFFFFF",
  texto: "#111827",
  borde: "#E5E7EB",
};

const ZONES = [
  {
    key: "primary",
    label: "Encabezado y botones",
    hint: "El fondo del encabezado, los botones y las pills de la tienda.",
    tokens: ["primary", "primary-texto"],
  },
  {
    key: "secondary",
    label: "Pie de página",
    hint: "Textos secundarios como el pie de la tienda.",
    tokens: ["secondary"],
  },
  {
    key: "accent",
    label: "Precios y destacados",
    hint: "El precio de los productos y la estrella de «Destacados».",
    tokens: ["accent"],
  },
  {
    key: "fondo",
    label: "Fondo de página",
    hint: "El color detrás de todo el contenido.",
    tokens: ["fondo"],
  },
  {
    key: "tarjeta",
    label: "Tarjetas de productos",
    hint: "El fondo y el borde de cada producto.",
    tokens: ["tarjeta", "borde"],
  },
  {
    key: "texto",
    label: "Títulos y textos",
    hint: "El nombre de la tienda, títulos y nombres de productos.",
    tokens: ["texto"],
  },
];

const CONTRAST_PAIRS = [
  { label: "Texto sobre fondo", a: "texto", b: "fondo", min: 4.5 },
  { label: "Texto sobre tarjeta", a: "texto", b: "tarjeta", min: 4.5 },
  { label: "Etiquetas en botón", a: "primary-texto", b: "primary", min: 4.5 },
  { label: "Precio sobre tarjeta", a: "accent", b: "tarjeta", min: 4.5 },
  { label: "Pie sobre fondo", a: "secondary", b: "fondo", min: 4.5 },
];

function effective(theme, base) {
  const merged = { ...DEFAULT_COLORS, ...base };
  for (const c of COLORS) {
    if (theme[c.key]) merged[c.key] = theme[c.key];
  }
  return merged;
}

function primaryGradient(primary) {
  return `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 72%, #0f172a) 100%)`;
}

function zoneClasses(active, hovered) {
  return `relative cursor-pointer transition-all duration-150 ${
    active
      ? "ring-2 ring-blue-500 ring-offset-2 z-10"
      : hovered
        ? "ring-2 ring-blue-400 ring-offset-1 opacity-100 z-10"
        : "hover:ring-2 hover:ring-blue-300 hover:ring-offset-1"
  }`;
}

function ZoneBadge({ label }) {
  return (
    <span className="absolute top-1.5 right-1.5 z-20 inline-flex items-center gap-1 rounded-md bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      {label}
    </span>
  );
}

function Chevron({ open }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
        open ? "rotate-180 text-blue-500" : "text-gray-400"
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SlideChevron({ dir }) {
  const d = dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function ProductIcon({ stroke, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v9" />
    </svg>
  );
}

export function ColorZones({ theme, base, assigned, onChange }) {
  const [active, setActive] = useState("primary");
  const [hovered, setHovered] = useState(null);
  const [open, setOpen] = useState(false);
  const t = effective(theme, base);

  const select = (key, e) => {
    if (e) e.stopPropagation();
    setActive(key);
    if (!open) setOpen(true);
  };

  const zone = ZONES.find((z) => z.key === active) || ZONES[0];

  const zoneDirty = zone.tokens.some(
    (key) => (theme[key] || "") !== ((assigned && assigned[key]) || "")
  );

  const restoreZone = () => {
    for (const key of zone.tokens) onChange(key, (assigned && assigned[key]) || "");
  };

  return (
    <div>
      {/* Selector de zonas — siempre visible y accesible */}
      <div role="group" aria-label="Zonas de la tienda">
        <p className="text-xs font-medium text-gray-500 mb-2">Zonas de la tienda</p>
        <div className="flex flex-wrap gap-1.5">
          {ZONES.map((z) => (
            <button
              key={z.key}
              type="button"
              onClick={() => select(z.key)}
              onMouseEnter={() => setHovered(z.key)}
              onMouseLeave={() => setHovered(null)}
              aria-pressed={active === z.key}
              title={z.hint}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                active === z.key
                  ? "border-blue-500 bg-blue-600 text-white font-semibold shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Botón de apertura del bloque avanzado */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="colorzones-advanced"
        id="colorzones-toggle"
        className={`mt-3 w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          open
            ? "border-blue-400 bg-blue-50 text-blue-700 shadow-sm"
            : "border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Chevron open={open} />
          <span className="truncate">Vista previa y edición avanzada</span>
        </span>
        <span className="shrink-0 text-[10px] text-gray-400 truncate">
          {open ? "Cerrar" : `Zona actual · ${zone.label}`}
        </span>
      </button>

      {/* Bloque avanzado: muestra + editor + contraste */}
      <div
        id="colorzones-advanced"
        role="region"
        aria-labelledby="colorzones-toggle"
        className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
          open
            ? "grid-rows-[1fr] opacity-100 visible mt-3"
            : "grid-rows-[0fr] opacity-0 invisible"
        }`}
      >
        <div className="overflow-hidden min-h-0">
          {/* Mapa visual fiel al storefront (ThemePreview) */}
          <div
            style={{ background: t.fondo }}
            className="rounded-xl border border-gray-200 overflow-hidden select-none"
          >
            {/* Header → primary */}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => select("primary", e)}
              onKeyDown={(e) => e.key === "Enter" && select("primary")}
              className={`${zoneClasses(active === "primary", hovered === "primary")} overflow-hidden`}
              style={{ background: primaryGradient(t.primary), color: t["primary-texto"] }}
            >
              {active === "primary" && <ZoneBadge label="Encabezado" />}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-20%,rgba(255,255,255,0.14),transparent_45%)] pointer-events-none" />
              <div className="relative px-3 py-2 flex items-center gap-2.5 pointer-events-none">
                <div className="h-8 w-8 rounded-lg bg-white/20 ring-1 ring-white/40 flex items-center justify-center text-[9px] font-bold">
                  M
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.2em] opacity-60 truncate">
                    Mi tienda
                  </p>
                  <p className="text-sm font-semibold leading-tight truncate">Hola, bienvenidos</p>
                  <p className="text-[10px] opacity-80 truncate">Productos recién hechos todos los días</p>
                </div>
              </div>
            </div>

            {/* Página → fondo */}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => select("fondo", e)}
              onKeyDown={(e) => e.key === "Enter" && select("fondo")}
              className={`${zoneClasses(active === "fondo", hovered === "fondo")} p-2 space-y-2`}
            >
              {active === "fondo" && <ZoneBadge label="Fondo" />}

              {/* Destacados */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p
                    role="button"
                    tabIndex={0}
                    onClick={(e) => select("texto", e)}
                    onKeyDown={(e) => e.key === "Enter" && select("texto")}
                    className={`${zoneClasses(active === "texto", hovered === "texto")} flex items-center gap-1 pr-3 rounded text-xs font-semibold tracking-tight`}
                    style={{ color: t.texto }}
                  >
                    <span style={{ color: t.accent }} aria-hidden>
                      ★
                    </span>
                    Destacados
                  </p>
                  <div className="flex items-center gap-1">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => select("primary", e)}
                      onKeyDown={(e) => e.key === "Enter" && select("primary")}
                      className={`${zoneClasses(active === "primary", hovered === "primary")} flex h-5 w-5 items-center justify-center rounded-full text-white`}
                      style={{
                        background: primaryGradient(t.primary),
                        boxShadow: `0 4px 14px -4px ${t.primary}80`,
                      }}
                    >
                      <SlideChevron dir="left" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => select("primary", e)}
                      onKeyDown={(e) => e.key === "Enter" && select("primary")}
                      className={`${zoneClasses(active === "primary", hovered === "primary")} flex h-5 w-5 items-center justify-center rounded-full text-white`}
                      style={{
                        background: primaryGradient(t.primary),
                        boxShadow: `0 4px 14px -4px ${t.primary}80`,
                      }}
                    >
                      <SlideChevron dir="right" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => select("primary", e)}
                      onKeyDown={(e) => e.key === "Enter" && select("primary")}
                      className={`${zoneClasses(active === "primary", hovered === "primary")} text-[9px] font-bold transition-colors`}
                      style={{ color: t.primary }}
                    >
                      Ver todos
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 overflow-hidden">
                  {["Pan casero", "Alfajores"].map((nombre, i) => (
                    <div
                      key={nombre}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => select("tarjeta", e)}
                      onKeyDown={(e) => e.key === "Enter" && select("tarjeta")}
                      className={`${zoneClasses(active === "tarjeta", hovered === "tarjeta")} relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-md`}
                      style={{
                        background: t.tarjeta,
                        border: `1px solid ${t.borde}`,
                      }}
                    >
                      {active === "tarjeta" && i === 0 && <ZoneBadge label="Tarjeta" />}
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: t.tarjeta }}
                      >
                        <ProductIcon stroke={t.borde} className="h-5 w-5 opacity-50" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-1.5">
                        <p className="truncate text-[7px] font-semibold uppercase tracking-wider text-white/70">
                          Panadería
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-snug text-white">
                          {nombre}
                        </p>
                        <p className="mt-0.5 text-[8px] font-bold tabular-nums text-white">
                          $1.200
                        </p>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => select("primary", e)}
                          onKeyDown={(e) => e.key === "Enter" && select("primary")}
                          className={`${zoneClasses(active === "primary", hovered === "primary")} mt-1 flex w-full items-center justify-between gap-1 rounded-md py-0.5 pl-2 pr-1 text-[7px] font-bold`}
                          style={{
                            background: "white",
                            color: t.primary,
                            border: `1px solid ${t.primary}40`,
                          }}
                        >
                          <span className="truncate">Ver más</span>
                          <span aria-hidden>→</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Productos */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p
                    role="button"
                    tabIndex={0}
                    onClick={(e) => select("texto", e)}
                    onKeyDown={(e) => e.key === "Enter" && select("texto")}
                    className={`${zoneClasses(active === "texto", hovered === "texto")} pr-3 rounded text-[10px] font-semibold`}
                    style={{ color: t.texto }}
                  >
                    Productos
                  </p>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => select("primary", e)}
                    onKeyDown={(e) => e.key === "Enter" && select("primary")}
                    className={`${zoneClasses(active === "primary", hovered === "primary")} text-[9px] px-2 py-0.5 rounded-full`}
                    style={{ background: t.primary, color: t["primary-texto"] }}
                  >
                    Todas
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { nombre: "Facturas x6", precio: "$2.200" },
                    { nombre: "Medialunas", precio: "$1.800" },
                    { nombre: "Torta", precio: "$5.000" },
                  ].map((p, i) => (
                    <div
                      key={p.nombre}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => select("tarjeta", e)}
                      onKeyDown={(e) => e.key === "Enter" && select("tarjeta")}
                      className={`${zoneClasses(active === "tarjeta", hovered === "tarjeta")} flex flex-col overflow-hidden rounded-md`}
                      style={{
                        background: t.tarjeta,
                        border: `1px solid ${t.borde}`,
                      }}
                    >
                      {active === "tarjeta" && i === 0 && <ZoneBadge label="Tarjeta" />}
                      <div className="h-12 bg-gray-200 flex items-center justify-center">
                        <ProductIcon stroke={t.borde} className="h-4 w-4 opacity-60" />
                      </div>
                      <div className="p-1.5 flex flex-col gap-0.5">
                        <p
                          role="button"
                          tabIndex={0}
                          onClick={(e) => select("texto", e)}
                          onKeyDown={(e) => e.key === "Enter" && select("texto")}
                          className={`${zoneClasses(active === "texto", hovered === "texto")} text-[9px] font-medium leading-tight truncate`}
                          style={{ color: t.texto }}
                        >
                          {p.nombre}
                        </p>
                        <p
                          role="button"
                          tabIndex={0}
                          onClick={(e) => select("accent", e)}
                          onKeyDown={(e) => e.key === "Enter" && select("accent")}
                          className={`${zoneClasses(active === "accent", hovered === "accent")} text-[9px] font-semibold self-start rounded`}
                          style={{ color: t.accent }}
                        >
                          {p.precio}
                        </p>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => select("primary", e)}
                          onKeyDown={(e) => e.key === "Enter" && select("primary")}
                          className={`${zoneClasses(active === "primary", hovered === "primary")} text-center text-[8px] font-medium rounded py-0.5`}
                          style={{
                            background: t.primary,
                            color: t["primary-texto"],
                            borderRadius: t.radio || "8px",
                          }}
                        >
                          Ver
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pie de página → secondary */}
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => select("secondary", e)}
                onKeyDown={(e) => e.key === "Enter" && select("secondary")}
                className={`${zoneClasses(active === "secondary", hovered === "secondary")} px-2 py-1 text-center text-[9px]`}
                style={{ borderTop: `1px solid ${t.borde}`, color: t.secondary }}
              >
                <p>Pie de tienda · Mi tienda</p>
              </div>
            </div>
          </div>

          {/* Editor de la zona activa */}
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/40 p-3">
            <p className="text-sm font-semibold text-gray-800 mb-1">{zone.label}</p>
            <p className="text-xs text-gray-500 mb-3">{zone.hint}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {zone.tokens.map((key) => {
                const meta = COLORS.find((c) => c.key === key);
                return (
                  <ColorField
                    key={key}
                    label={meta?.label || key}
                    value={theme[key] || ""}
                    base={base[key]}
                    onChange={(value) => onChange(key, value)}
                  />
                );
              })}
            </div>
          </div>

          {/* Estado asignado + restablecer la zona */}
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-gray-600">{zone.label} · asignado</p>
              <button
                type="button"
                onClick={restoreZone}
                disabled={!zoneDirty}
                title={
                  zoneDirty
                    ? "Vuelve a los colores ya asignados de esta zona"
                    : "No hay cambios pendientes en esta zona"
                }
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors ${
                  zoneDirty
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Restablecer a lo asignado
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {zone.tokens.map((key) => {
                const meta = COLORS.find((c) => c.key === key);
                const assignedColor = (assigned && assigned[key]) || null;
                const dirty = (theme[key] || "") !== (assignedColor || "");
                return (
                  <div key={key} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-md border border-gray-300 shrink-0"
                        style={{ background: assignedColor || "#ffffff" }}
                      />
                      <span className="text-[11px] text-gray-600 truncate">{meta?.label || key}</span>
                    </span>
                    <span
                      className={`font-mono text-[10px] shrink-0 ${
                        dirty ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      {dirty ? "editado · " : ""}
                      {assignedColor || "Hereda"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Es el esquema en vigencia para esta zona: lo que la sucursal tiene asignado
              sobre lo heredado del negocio.
            </p>
          </div>

          {/* Contraste en vivo (informativo) */}
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Contraste del esquema</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {CONTRAST_PAIRS.map(({ label, a, b, min }) => {
                const r = contrastRatio(t[a], t[b]);
                const ok = r !== null && r >= min;
                return (
                  <div
                    key={label}
                    className={`rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs ${
                      ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="flex -space-x-0.5 shrink-0">
                        <span className="h-3 w-3 rounded-full border border-gray-300" style={{ background: t[a] }} />
                        <span className="h-3 w-3 rounded-full border border-gray-300" style={{ background: t[b] }} />
                      </span>
                      <span className={`truncate ${ok ? "text-green-800" : "text-red-700"}`}>{label}</span>
                    </span>
                    <span className={`font-mono font-semibold ${ok ? "text-green-600" : "text-red-600"}`}>
                      {ok ? "✓" : "✕"} {r !== null ? r.toFixed(1) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              El contraste mide cuán legible queda el texto. ✓ cumple AA (4.5:1 o más),
              ✕ conviene subirlo para que no se lea difícil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}