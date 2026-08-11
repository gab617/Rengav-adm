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

function publicUrl(path) {
  return path
    ? supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl
    : null;
}

export function ThemePreview({ nombre, tenantNombre, theme, lema, descripcion, logoUrl, heroUrl }) {
  const t = { ...DEFAULTS, ...theme };

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        background: t.fondo,
        color: t.texto,
        fontFamily: t["font-cuerpo"],
        borderColor: t.borde,
      }}
    >
      {/* Header */}
      <div style={{ background: t.primary, color: t["primary-texto"] }}>
        <div className="px-4 py-3 flex items-center gap-3">
          {logoUrl && (
            <img
              src={publicUrl(logoUrl)}
              alt=""
              className="h-10 w-10 rounded-lg object-cover bg-white/20"
            />
          )}
          <div className="min-w-0">
            <p
              className="font-bold text-sm truncate"
              style={{ fontFamily: t["font-titulos"] }}
            >
              {nombre}
            </p>
            <p className="text-xs opacity-80 truncate">{lema || tenantNombre}</p>
          </div>
        </div>
      </div>

      {heroUrl && (
        <img src={publicUrl(heroUrl)} alt="" className="w-full h-20 object-cover" />
      )}

      {descripcion && (
        <p className="px-4 pt-3 text-[10px] leading-snug opacity-80">
          {descripcion}
        </p>
      )}

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
