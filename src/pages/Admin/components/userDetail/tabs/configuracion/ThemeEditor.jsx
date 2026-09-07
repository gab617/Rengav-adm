import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ThemePreview } from "./ThemePreview";
import { PreviewFab, PreviewModal } from "./PreviewModal";
import { ImageUpload } from "./ImageUpload";
import { COLORS, FONT_OPTIONS, SHAPE_OPTIONS } from "./themeData";
import { ColorZones } from "./ColorZones";
import {
  FontPicker,
  GroupCard,
  PalettePicker,
  TokenSelect,
} from "./themeControls";

export function ThemeEditor({
  profile,
  sucursal,
  tenant,
  tenantNombre,
  effective,
  saving,
  onSave,
}) {
  const logoRef = useRef(null);
  const heroRef = useRef(null);
  const previewColRef = useRef(null);
  const previewPanelRef = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const col = previewColRef.current;
    const panel = previewPanelRef.current;
    if (!col || !panel) return;

    const TOP_LIMIT = 24;
    const BOTTOM_MARGIN = 12;
    const DAMPING = 0.5;

    let scrollTarget = window;
    const isScrollableY = (el) => {
      const style = getComputedStyle(el);
      const oy = style.overflowY;
      return (
        (oy === "auto" || oy === "scroll" || oy === "overlay") &&
        el.scrollHeight > el.clientHeight
      );
    };
    let node = col.parentElement;
    while (node) {
      if (isScrollableY(node)) {
        scrollTarget = node;
        break;
      }
      node = node.parentElement;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const colTop = col.getBoundingClientRect().top;
      const panelH = panel.offsetHeight;
      const vh = window.innerHeight;

      let target = colTop;
      if (colTop < TOP_LIMIT) {
        const over = TOP_LIMIT - colTop;
        target = TOP_LIMIT + over * DAMPING;
      }
      target = Math.min(target, vh - BOTTOM_MARGIN - panelH);
      target = Math.max(target, colTop);

      panel.style.transform = `translateY(${Math.round(Math.max(0, target - colTop))}px)`;
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();

    return () => {
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const baseTheme = tenant?.theme || {};

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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
      {/* ============ FORMULARIO ============ */}
      <div className="xl:col-span-2 space-y-4 sm:space-y-6">
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
                className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <PalettePicker onApply={applyPalette} />

          <ColorZones
            theme={form.theme}
            base={baseTheme}
            assigned={effective.theme || {}}
            onChange={setToken}
          />

          <p className="text-xs text-gray-400 mt-3">
            Tocá una zona del dibujo para editarla. Un color vacío se hereda
            del negocio y el ✕ lo deja vacío.
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
              base={baseTheme["font-titulos"]}
              onChange={(v) => setToken("font-titulos", v)}
            />
            <FontPicker
              label="Fuente de cuerpo"
              options={FONT_OPTIONS}
              value={form.theme["font-cuerpo"] || ""}
              base={baseTheme["font-cuerpo"]}
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
              base={baseTheme.radio}
              onChange={(v) => setToken("radio", v)}
            />
            <TokenSelect
              label="Columnas de productos"
              options={SHAPE_OPTIONS["columnas-grid"]}
              value={form.theme["columnas-grid"] || ""}
              base={baseTheme["columnas-grid"]}
              onChange={(v) => setToken("columnas-grid", v)}
            />
          </div>
        </GroupCard>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
      <div className="hidden xl:block xl:col-span-1" ref={previewColRef}>
        <div
          ref={previewPanelRef}
          className="flex max-h-[calc(100vh-2rem)] flex-col gap-2 will-change-transform">
          <p className="text-sm font-medium text-gray-600 shrink-0">Vista previa en vivo</p>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl">
            <ThemePreview
              nombre={profile.name}
              tenantNombre={tenantNombre}
              theme={form.theme}
              lema={form.lema}
              descripcion={form.descripcion}
              logoUrl={form.logo_url}
              heroUrl={form.hero_url}
            />
          </div>
          <p className="text-xs text-gray-400 shrink-0">
            Así se ve la tienda con los tokens actuales. Se guarda recién al tocar
            «Guardar estilo».
          </p>
        </div>
      </div>

      <PreviewFab onOpen={() => setPreviewOpen(true)} />

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        nombre={profile.name}
        tenantNombre={tenantNombre}
        theme={form.theme}
        lema={form.lema}
        descripcion={form.descripcion}
        logoUrl={form.logo_url}
        heroUrl={form.hero_url}
      />
    </div>
  );
}