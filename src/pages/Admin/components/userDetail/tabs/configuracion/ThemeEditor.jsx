import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { ThemePreview } from "./ThemePreview";
import { ImageUpload } from "./ImageUpload";

const COLORS = [
  { key: "primary", label: "Principal" },
  { key: "primary-texto", label: "Texto sobre principal" },
  { key: "secondary", label: "Secundario" },
  { key: "accent", label: "Acento" },
  { key: "fondo", label: "Fondo de página" },
  { key: "tarjeta", label: "Tarjetas" },
  { key: "texto", label: "Texto" },
  { key: "borde", label: "Bordes" },
];

const PALETTES = [
  {
    name: "Clásica",
    tema: "claro",
    colors: {
      primary: "#2563EB",
      "primary-texto": "#FFFFFF",
      secondary: "#64748B",
      accent: "#F59E0B",
      fondo: "#F8FAFC",
      tarjeta: "#FFFFFF",
      texto: "#0F172A",
      borde: "#E2E8F0",
    },
  },
  {
    name: "Cálida",
    tema: "claro",
    colors: {
      primary: "#C2410C",
      "primary-texto": "#FFF7ED",
      secondary: "#92400E",
      accent: "#F59E0B",
      fondo: "#FFF8F0",
      tarjeta: "#FFFFFF",
      texto: "#431407",
      borde: "#FED7AA",
    },
  },
  {
    name: "Rosada",
    tema: "claro",
    colors: {
      primary: "#DB2777",
      "primary-texto": "#FFFFFF",
      secondary: "#EC4899",
      accent: "#FB923C",
      fondo: "#FDF2F8",
      tarjeta: "#FFFFFF",
      texto: "#500724",
      borde: "#FBCFE8",
    },
  },
  {
    name: "Violeta",
    tema: "claro",
    colors: {
      primary: "#7C3AED",
      "primary-texto": "#FFFFFF",
      secondary: "#A78BFA",
      accent: "#F59E0B",
      fondo: "#F5F3FF",
      tarjeta: "#FFFFFF",
      texto: "#2E1065",
      borde: "#DDD6FE",
    },
  },
  {
    name: "Verde bosque",
    tema: "claro",
    colors: {
      primary: "#15803D",
      "primary-texto": "#F0FDF4",
      secondary: "#65A30D",
      accent: "#FBBF24",
      fondo: "#F0FDF4",
      tarjeta: "#FFFFFF",
      texto: "#052E16",
      borde: "#BBF7D0",
    },
  },
  {
    name: "Esmeralda",
    tema: "claro",
    colors: {
      primary: "#0D9488",
      "primary-texto": "#F0FDFA",
      secondary: "#2DD4BF",
      accent: "#8B5CF6",
      fondo: "#F0FDFA",
      tarjeta: "#FFFFFF",
      texto: "#042F2E",
      borde: "#99F6E4",
    },
  },
  {
    name: "Océano",
    tema: "claro",
    colors: {
      primary: "#0369A1",
      "primary-texto": "#F0F9FF",
      secondary: "#0EA5E9",
      accent: "#F43F5E",
      fondo: "#F0F9FF",
      tarjeta: "#FFFFFF",
      texto: "#0C4A6E",
      borde: "#BAE6FD",
    },
  },
  {
    name: "Vino",
    tema: "claro",
    colors: {
      primary: "#9F1239",
      "primary-texto": "#FFF1F2",
      secondary: "#BE123C",
      accent: "#FBBF24",
      fondo: "#FFF1F2",
      tarjeta: "#FFFFFF",
      texto: "#4C0519",
      borde: "#FECDD3",
    },
  },
  {
    name: "Dorado",
    tema: "claro",
    colors: {
      primary: "#B45309",
      "primary-texto": "#FFFBEB",
      secondary: "#92400E",
      accent: "#FDE047",
      fondo: "#FFFDF5",
      tarjeta: "#FFFFFF",
      texto: "#451A03",
      borde: "#FDE68A",
    },
  },
  {
    name: "Minimal",
    tema: "claro",
    colors: {
      primary: "#18181B",
      "primary-texto": "#FAFAFA",
      secondary: "#52525B",
      accent: "#E11D48",
      fondo: "#FFFFFF",
      tarjeta: "#FAFAFA",
      texto: "#18181B",
      borde: "#E4E4E7",
    },
  },
  {
    name: "Playful",
    tema: "claro",
    colors: {
      primary: "#F43F5E",
      "primary-texto": "#FFFFFF",
      secondary: "#FB7185",
      accent: "#FB923C",
      fondo: "#FFF1F2",
      tarjeta: "#FFFFFF",
      texto: "#4C0519",
      borde: "#FECDD3",
    },
  },
  {
    name: "Arena",
    tema: "claro",
    colors: {
      primary: "#6F4E37",
      "primary-texto": "#FDF6EC",
      secondary: "#9B7350",
      accent: "#D4A017",
      fondo: "#FAF6EE",
      tarjeta: "#FFFFFF",
      texto: "#2E2118",
      borde: "#E8DEC8",
    },
  },
  {
    name: "Terra",
    tema: "intermedio",
    colors: {
      primary: "#F2A65A",
      "primary-texto": "#4A2A18",
      secondary: "#E7C9A8",
      accent: "#E85D3D",
      fondo: "#7C4A32",
      tarjeta: "#935A3D",
      texto: "#FDF3EC",
      borde: "#A96E4E",
    },
  },
  {
    name: "Salvia",
    tema: "intermedio",
    colors: {
      primary: "#A8C686",
      "primary-texto": "#2E3B2C",
      secondary: "#B8CDB4",
      accent: "#E9C46A",
      fondo: "#5C715E",
      tarjeta: "#708574",
      texto: "#F2F7F0",
      borde: "#869B82",
    },
  },
  {
    name: "Lavanda",
    tema: "intermedio",
    colors: {
      primary: "#B794F4",
      "primary-texto": "#2A1D45",
      secondary: "#C9B6E5",
      accent: "#FFD166",
      fondo: "#6E5A8C",
      tarjeta: "#7E6B9E",
      texto: "#F6F2FB",
      borde: "#9482B4",
    },
  },
  {
    name: "Petróleo",
    tema: "intermedio",
    colors: {
      primary: "#7FD1D9",
      "primary-texto": "#0F3338",
      secondary: "#A9DDE3",
      accent: "#F4B942",
      fondo: "#2F5D63",
      tarjeta: "#3C6F76",
      texto: "#EFFAFB",
      borde: "#529199",
    },
  },
  {
    name: "Café",
    tema: "intermedio",
    colors: {
      primary: "#E0A458",
      "primary-texto": "#3C2A18",
      secondary: "#C9B08F",
      accent: "#E2703A",
      fondo: "#5C4632",
      tarjeta: "#6D5540",
      texto: "#FAF3E8",
      borde: "#8A6F55",
    },
  },
  {
    name: "Grafito",
    tema: "intermedio",
    colors: {
      primary: "#60A5FA",
      "primary-texto": "#0B2340",
      secondary: "#9CA3AF",
      accent: "#34D399",
      fondo: "#4B5563",
      tarjeta: "#5A6572",
      texto: "#F3F4F6",
      borde: "#6B7583",
    },
  },
  {
    name: "Ocre",
    tema: "intermedio",
    colors: {
      primary: "#E9C46A",
      "primary-texto": "#3A2F12",
      secondary: "#C7B377",
      accent: "#E76F51",
      fondo: "#6B5B2E",
      tarjeta: "#7D6C3B",
      texto: "#FAF6E8",
      borde: "#96843F",
    },
  },
  {
    name: "Rosado",
    tema: "intermedio",
    colors: {
      primary: "#F48498",
      "primary-texto": "#4A1626",
      secondary: "#E8B4C0",
      accent: "#FFD166",
      fondo: "#8E4A5B",
      tarjeta: "#A05A6C",
      texto: "#FEF1F4",
      borde: "#BB7184",
    },
  },
  {
    name: "Oscura",
    tema: "oscuro",
    colors: {
      primary: "#6366F1",
      "primary-texto": "#FFFFFF",
      secondary: "#94A3B8",
      accent: "#22D3EE",
      fondo: "#0F172A",
      tarjeta: "#1E293B",
      texto: "#E2E8F0",
      borde: "#334155",
    },
  },
  {
    name: "Medianoche",
    tema: "oscuro",
    colors: {
      primary: "#3B82F6",
      "primary-texto": "#FFFFFF",
      secondary: "#60A5FA",
      accent: "#F472B6",
      fondo: "#020617",
      tarjeta: "#0F172A",
      texto: "#CBD5E1",
      borde: "#1E293B",
    },
  },
  {
    name: "Carbón",
    tema: "oscuro",
    colors: {
      primary: "#22C55E",
      "primary-texto": "#052E16",
      secondary: "#4ADE80",
      accent: "#22D3EE",
      fondo: "#09090B",
      tarjeta: "#18181B",
      texto: "#D4D4D8",
      borde: "#27272A",
    },
  },
  {
    name: "Púrpura neón",
    tema: "oscuro",
    colors: {
      primary: "#A855F7",
      "primary-texto": "#2E1065",
      secondary: "#C084FC",
      accent: "#F0ABFC",
      fondo: "#0D0A1A",
      tarjeta: "#1C1733",
      texto: "#E9E4F5",
      borde: "#2E2650",
    },
  },
  {
    name: "Cobre",
    tema: "oscuro",
    colors: {
      primary: "#FB923C",
      "primary-texto": "#431407",
      secondary: "#FDBA74",
      accent: "#FBBF24",
      fondo: "#1C1917",
      tarjeta: "#292524",
      texto: "#E7E5E4",
      borde: "#44403C",
    },
  },
  {
    name: "Bosque nocturno",
    tema: "oscuro",
    colors: {
      primary: "#4ADE80",
      "primary-texto": "#022C22",
      secondary: "#2DD4BF",
      accent: "#FBBF24",
      fondo: "#052E16",
      tarjeta: "#14532D",
      texto: "#DCFCE7",
      borde: "#166534",
    },
  },
];

const FONT_OPTIONS = [
  { value: "", label: "Heredar (del negocio)" },
  { value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", label: "Sans (sistema)" },
  { value: "'Segoe UI', system-ui, sans-serif", label: "Segoe UI" },
  { value: "Georgia, 'Times New Roman', serif", label: "Serif" },
  { value: "'Trebuchet MS', 'Segoe UI', sans-serif", label: "Trebuchet" },
  { value: "'Courier New', ui-monospace, monospace", label: "Mono" },
];

const SHAPE_OPTIONS = {
  radio: [
    { value: "", label: "Heredar (del negocio)" },
    { value: "0px", label: "Cuadrado" },
    { value: "8px", label: "Suave" },
    { value: "16px", label: "Redondeado" },
    { value: "9999px", label: "Píldora" },
  ],
  "columnas-grid": [
    { value: "", label: "Heredar (del negocio)" },
    { value: "2", label: "2 columnas" },
    { value: "3", label: "3 columnas" },
    { value: "4", label: "4 columnas" },
  ],
};

function GroupCard({ title, children, onRestore, restoring }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
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

function ColorField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-8 w-10 rounded-lg border border-gray-200 shrink-0"
          style={{ background: value || "#ffffff" }}
          title={value || "Heredando"}
        />
        <label className="text-sm text-gray-700">{label}</label>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Heredar"
          className="w-20 text-xs font-mono border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          title="Elegir color"
          className="h-8 w-9 cursor-pointer rounded border border-gray-200 bg-transparent"
        />
        <button
          type="button"
          onClick={() => onChange("")}
          title="Heredar del negocio"
          className="text-xs text-gray-400 hover:text-red-500 px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function TokenSelect({ label, options, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.value || `_${o.label}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FontPicker({ label, options, value, onChange }) {
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
    </div>
  );
}

export function ThemeEditor({
  profile,
  sucursal,
  tenantNombre,
  effective,
  saving,
  onSave,
}) {
  const logoRef = useRef(null);
  const heroRef = useRef(null);

  const [form, setForm] = useState(() => ({
    lema: effective.lema || "",
    descripcion: effective.descripcion || "",
    logo_url: effective.logo_url || null,
    hero_url: effective.hero_url || null,
    theme: { ...effective.theme },
  }));

  const setToken = (key, value) =>
    setForm((f) => ({ ...f, theme: { ...f.theme, [key]: value } }));

  const applyPalette = (palette) =>
    setForm((f) => ({ ...f, theme: { ...f.theme, ...palette.colors } }));

  const syncFromSaved = (res) => {
    setForm({
      lema: res.effective.lema || "",
      descripcion: res.effective.descripcion || "",
      logo_url: res.effective.logo_url || null,
      hero_url: res.effective.hero_url || null,
      theme: { ...res.effective.theme },
    });
  };

  const handleSave = async () => {
    if (saving) return;
    const res = await onSave(form);
    if (res?.ok) {
      syncFromSaved(res);
      toast.success("Estilo de la tienda guardado");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleRestore = async () => {
    if (saving) return;
    if (
      !confirm(
        "¿Restaurar el estilo del negocio para esta sucursal?\n\nSe pierde el lema, la descripción, el logo, el hero y todos los colores propios. La sucursal volverá a heredar todo del negocio."
      )
    )
      return;

    const res = await onSave({
      lema: "",
      descripcion: "",
      logo_url: null,
      hero_url: null,
      theme: {},
    });

    if (res?.ok) {
      syncFromSaved(res);
      toast.success("Sucursal restaurada: todo hereda del negocio");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleRestoreIdentidad = async () => {
    if (saving) return;
    if (
      !confirm(
        "¿Restaurar la identidad de esta sucursal?\n\nEl lema y la descripción se limpian y vuelve a heredar los del negocio. El resto del formulario se guarda tal cual está."
      )
    )
      return;

    const res = await onSave({ ...form, lema: "", descripcion: "" });
    if (res?.ok) {
      syncFromSaved(res);
      toast.success("Identidad restaurada: hereda del negocio");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleRestoreImagenes = async () => {
    if (saving) return;
    if (
      !confirm(
        "¿Restaurar las imágenes de esta sucursal?\n\nEl logo y la portada propios se eliminan y vuelve a usar las del negocio. El resto del formulario se guarda tal cual está."
      )
    )
      return;

    await Promise.all([
      logoRef.current?.removeOwn(),
      heroRef.current?.removeOwn(),
    ]);

    const res = await onSave({ ...form, logo_url: null, hero_url: null });
    if (res?.ok) {
      syncFromSaved(res);
      toast.success("Imágenes restauradas: hereda del negocio");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleRestoreColores = async () => {
    if (saving) return;
    if (
      !confirm(
        "¿Restaurar los colores de esta sucursal?\n\nTodos los colores propios se limpian y vuelve a heredar los del negocio. El resto del formulario se guarda tal cual está."
      )
    )
      return;

    const theme = { ...form.theme };
    for (const c of COLORS) theme[c.key] = "";

    const res = await onSave({ ...form, theme });
    if (res?.ok) {
      syncFromSaved(res);
      toast.success("Colores restaurados: hereda del negocio");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleRestoreTipografia = async () => {
    if (saving) return;
    if (
      !confirm(
        "¿Restaurar la tipografía de esta sucursal?\n\nLas fuentes propias se limpian y vuelve a heredar las del negocio. El resto del formulario se guarda tal cual está."
      )
    )
      return;

    const res = await onSave({
      ...form,
      theme: { ...form.theme, "font-titulos": "", "font-cuerpo": "" },
    });
    if (res?.ok) {
      syncFromSaved(res);
      toast.success("Tipografía restaurada: hereda del negocio");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleRestoreForma = async () => {
    if (saving) return;
    if (
      !confirm(
        "¿Restaurar la forma y el layout de esta sucursal?\n\nLas esquinas y las columnas propias se limpian y vuelve a heredar las del negocio. El resto del formulario se guarda tal cual está."
      )
    )
      return;

    const res = await onSave({
      ...form,
      theme: { ...form.theme, radio: "", "columnas-grid": "" },
    });
    if (res?.ok) {
      syncFromSaved(res);
      toast.success("Forma y layout restaurados: hereda del negocio");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ============ FORMULARIO ============ */}
      <div className="xl:col-span-2 space-y-6">
        <GroupCard
          title="Identidad"
          onRestore={handleRestoreIdentidad}
          restoring={saving}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-gray-700">Lema</span>
              <input
                value={form.lema}
                onChange={(e) => setForm((f) => ({ ...f, lema: e.target.value }))}
                placeholder="Ej: Panadería de barrio"
                className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">Descripción</span>
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                rows={2}
                placeholder="Una línea que cuente qué hace la tienda."
                className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {profile.slug && (
              <p className="text-xs text-gray-400">
                URL de la tienda: <span className="font-mono">/{profile.slug}</span>
                <span className="ml-1">(el slug se edita aparte)</span>
              </p>
            )}
          </div>
        </GroupCard>

        <GroupCard
          title="Imágenes"
          onRestore={handleRestoreImagenes}
          restoring={saving}
        >
          <div className="space-y-5">
            <ImageUpload
              ref={logoRef}
              tenantId={profile.tenant_id}
              tipo="logo"
              label="Logo"
              hint="Se muestra en el encabezado de la tienda."
              ownPath={sucursal?.logo_url ?? null}
              value={form.logo_url}
              onChange={(path) => setForm((f) => ({ ...f, logo_url: path }))}
            />
            <ImageUpload
              ref={heroRef}
              tenantId={profile.tenant_id}
              tipo="hero"
              label="Imagen de portada (hero)"
              hint="Banner ancho debajo del encabezado."
              ownPath={sucursal?.hero_url ?? null}
              value={form.hero_url}
              onChange={(path) => setForm((f) => ({ ...f, hero_url: path }))}
            />
          </div>
        </GroupCard>

        <GroupCard
          title="Colores"
          onRestore={handleRestoreColores}
          restoring={saving}
        >
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
                        onClick={() => applyPalette(p)}
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
              Al tocar una paleta se aplican esos colores al formulario. No se
              guarda hasta tocar «Guardar estilo».
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {COLORS.map((c) => (
              <ColorField
                key={c.key}
                label={c.label}
                value={form.theme[c.key] || ""}
                onChange={(value) => setToken(c.key, value)}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Un color vacío se hereda del negocio. El ✕ lo deja vacío.
          </p>
        </GroupCard>

        <GroupCard
          title="Tipografía"
          onRestore={handleRestoreTipografia}
          restoring={saving}
        >
          <p className="text-xs text-gray-400 mb-3">
            Cada opción se muestra escrita en su propia fuente. La tienda usa
            estas mismas familias.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FontPicker
              label="Fuente de títulos"
              options={FONT_OPTIONS}
              value={form.theme["font-titulos"] || ""}
              onChange={(v) => setToken("font-titulos", v)}
            />
            <FontPicker
              label="Fuente de cuerpo"
              options={FONT_OPTIONS}
              value={form.theme["font-cuerpo"] || ""}
              onChange={(v) => setToken("font-cuerpo", v)}
            />
          </div>
        </GroupCard>

        <GroupCard
          title="Forma y layout"
          onRestore={handleRestoreForma}
          restoring={saving}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TokenSelect
              label="Radio de esquinas"
              options={SHAPE_OPTIONS.radio}
              value={form.theme.radio || ""}
              onChange={(v) => setToken("radio", v)}
            />
            <TokenSelect
              label="Columnas de productos"
              options={SHAPE_OPTIONS["columnas-grid"]}
              value={form.theme["columnas-grid"] || ""}
              onChange={(v) => setToken("columnas-grid", v)}
            />
          </div>
        </GroupCard>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar estilo"}
          </button>

          <button
            onClick={handleRestore}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Restaurar estilo del negocio
          </button>
        </div>
      </div>

      {/* ============ PREVIEW ============ */}
      <div className="xl:col-span-1">
        <div className="xl:sticky xl:top-4 space-y-2">
          <p className="text-sm font-medium text-gray-600">Vista previa en vivo</p>
          <ThemePreview
            nombre={profile.name}
            tenantNombre={tenantNombre}
            theme={form.theme}
            lema={form.lema}
            descripcion={form.descripcion}
            logoUrl={form.logo_url}
            heroUrl={form.hero_url}
          />
          <p className="text-xs text-gray-400">
            Así se ve la tienda con los tokens actuales. Se guarda recién al tocar
            «Guardar estilo».
          </p>
        </div>
      </div>
    </div>
  );
}
