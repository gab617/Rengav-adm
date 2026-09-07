import { supabase } from "../../../../../../services/supabaseClient";

const DEFAULTS = {
  primary: "#2563eb",
  "primary-texto": "#ffffff",
  secondary: "#4b5563",
  accent: "#db2777",
  fondo: "#f9fafb",
  tarjeta: "#ffffff",
  texto: "#111827",
  borde: "#e5e7eb",
  radio: "12px",
  "columnas-grid": "3",
  "font-titulos": "system-ui, sans-serif",
  "font-cuerpo": "system-ui, sans-serif",
};

const FAKE_PRODUCTS = [
  { nombre: "Pan casero", precio: "$1.500" },
  { nombre: "Facturas x6", precio: "$2.200" },
  { nombre: "Medialunas", precio: "$1.800" },
  { nombre: "Bizcochitos", precio: "$900" },
  { nombre: "Torta", precio: "$5.000" },
  { nombre: "Alfajores", precio: "$1.200" },
];

const FAKE_CATEGORIA = "Panadería";

function publicUrl(path) {
  return path
    ? supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl
    : null;
}

function primaryGradient(primary) {
  return `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, #0f172a) 100%)`;
}

function Chevron({ dir }) {
  const d = dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";
  return (
    <svg
      className="h-3.5 w-3.5"
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

function FeaturedCardPreview({ p, t }) {
  return (
    <article
      className="relative aspect-[4/5] w-full overflow-hidden"
      style={{
        borderRadius: t.radio,
        background: t.tarjeta,
        border: `1px solid ${t.borde}`,
        boxShadow: "0 1px 3px rgba(0,0,0,.08)",
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: t.tarjeta }}
      >
        <svg
          className="h-8 w-8 opacity-50"
          viewBox="0 0 24 24"
          fill="none"
          stroke={t.borde}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v9" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="truncate text-[8px] font-semibold uppercase tracking-wider text-white/70">
          {FAKE_CATEGORIA}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug text-white">
          {p.nombre}
        </p>
        <p className="mt-0.5 text-[10px] font-bold tabular-nums text-white">
          {p.precio}
        </p>
        <span
          className="mt-1.5 flex w-full items-center justify-between gap-1 rounded-lg py-1 pl-2.5 pr-1.5 text-[8px] font-bold shadow-sm"
          style={{
            background: "white",
            color: t.primary,
            border: `1px solid ${t.primary}40`,
          }}
        >
          <span className="truncate">Ver más en {FAKE_CATEGORIA}</span>
          <span aria-hidden>→</span>
        </span>
      </div>
    </article>
  );
}

function FeaturedSectionPreview({ t }) {
  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-2 px-4">
        <h2
          className="flex items-center gap-1.5 text-sm font-semibold tracking-tight"
          style={{ color: t.texto, fontFamily: t["font-titulos"] }}
        >
          <span className="text-xs" style={{ color: t.accent }} aria-hidden>
            ★
          </span>
          Destacados
        </h2>
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md"
            style={{
              background: primaryGradient(t.primary),
              boxShadow: `0 4px 14px -4px ${t.primary}80`,
            }}
          >
            <Chevron dir="left" />
          </span>
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md"
            style={{
              background: primaryGradient(t.primary),
              boxShadow: `0 4px 14px -4px ${t.primary}80`,
            }}
          >
            <Chevron dir="right" />
          </span>
          <span
            className="text-[10px] font-bold transition-colors"
            style={{ color: t.primary }}
          >
            Ver todos
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-hidden px-4 [mask-image:linear-gradient(90deg,black_85%,transparent)]">
        {FAKE_PRODUCTS.slice(0, 4).map((p) => (
          <div key={p.nombre} className="w-28 shrink-0 sm:w-32">
            <FeaturedCardPreview p={p} t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThemePreview({ nombre, tenantNombre, theme, lema, descripcion, logoUrl, heroUrl }) {
  const t = { ...DEFAULTS, ...theme };

  return (
    <div
      className="rounded-xl overflow-hidden border bg-white"
      style={{
        background: t.fondo,
        color: t.texto,
        fontFamily: t["font-cuerpo"],
        borderColor: t.borde,
      }}
    >
      {/* Header (igual a StoreHeader del storefront) */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${t.primary} 0%, color-mix(in srgb, ${t.primary} 72%, #0f172a) 100%)`,
          color: t["primary-texto"],
        }}
      >
        {heroUrl && (
          <div className="absolute inset-0">
            <img
              src={publicUrl(heroUrl)}
              alt=""
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${t.primary} 72%, transparent) 0%, color-mix(in srgb, #0f172a 62%, transparent) 100%)`,
              }}
            />
          </div>
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-20%,rgba(255,255,255,0.14),transparent_45%)] pointer-events-none" />

        <div className="relative px-4 py-3.5">
          {logoUrl && (
            <img
              src={publicUrl(logoUrl)}
              alt={nombre}
              className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/30 bg-white/10 shadow-lg mb-2"
            />
          )}
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-60 truncate">
            {tenantNombre}
          </p>
          <h1
            className="text-lg font-semibold tracking-tight leading-tight truncate"
            style={{ fontFamily: t["font-titulos"] }}
          >
            {nombre}
          </h1>
          {lema && <p className="mt-0.5 text-[11px] opacity-80">{lema}</p>}
          {descripcion && (
            <p className="mt-2 text-[10px] leading-snug opacity-70 max-w-[26ch]">
              {descripcion}
            </p>
          )}
        </div>
      </div>

      <FeaturedSectionPreview t={t} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold">Productos</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: t.primary, color: t["primary-texto"] }}
          >
            Todas
          </span>
        </div>

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${t["columnas-grid"]}, minmax(0, 1fr))`,
          }}
        >
          {FAKE_PRODUCTS.map((p) => (
            <div
              key={p.nombre}
              className="flex flex-col overflow-hidden"
              style={{
                background: t.tarjeta,
                border: `1px solid ${t.borde}`,
                borderRadius: t.radio,
                boxShadow: "0 1px 3px rgba(0,0,0,.08)",
              }}
            >
              <div className="aspect-square bg-gray-200 flex items-center justify-center text-lg">
                📦
              </div>
              <div className="p-2 flex flex-col gap-1">
                <p className="text-[10px] font-medium leading-tight truncate">
                  {p.nombre}
                </p>
                <p className="text-[10px] font-semibold" style={{ color: t.accent }}>
                  {p.precio}
                </p>
                <span
                  className="text-center text-[9px] font-medium rounded py-1"
                  style={{
                    background: t.primary,
                    color: t["primary-texto"],
                    borderRadius: t.radio,
                  }}
                >
                  Ver
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer
        className="px-4 py-2 text-center text-[9px]"
        style={{ borderTop: `1px solid ${t.borde}`, color: t.secondary }}
      >
        {tenantNombre}
      </footer>
    </div>
  );
}