import { DeviceToggle, ThemePreview } from "./ThemePreview";

export function PreviewFab({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed left-4 right-4 max-w-sm mx-auto z-40 xl:hidden flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold shadow-2xl shadow-blue-900/40 hover:bg-blue-700 active:scale-[0.99] transition-all bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] lg:bottom-6 lg:max-w-xs"
    >
      <span aria-hidden="true">👁</span>
      Vista previa en vivo
    </button>
  );
}

export function PreviewModal({
  open,
  onClose,
  viewMode,
  onViewModeChange,
  nombre,
  tenantNombre,
  theme,
  lema,
  descripcion,
  logoUrl,
  heroUrl,
  onHeroPositionChange,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col xl:hidden bg-gray-950/70"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-gray-900">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-sm font-medium text-white shrink-0">Vista previa en vivo</p>
          <DeviceToggle value={viewMode} onChange={onViewModeChange} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium text-white transition-colors"
        >
          Cerrar<span aria-hidden="true">✕</span>
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto overscroll-contain p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={viewMode === "mobile" ? "mx-auto max-w-[390px] space-y-3 pb-4" : "space-y-3 pb-4"}>
          <ThemePreview
            device={viewMode}
            nombre={nombre}
            tenantNombre={tenantNombre}
            theme={theme}
            lema={lema}
            descripcion={descripcion}
            logoUrl={logoUrl}
            heroUrl={heroUrl}
            onHeroPositionChange={onHeroPositionChange}
          />
          <p className="text-[11px] text-center text-gray-400">
            Así se ve la tienda con los tokens actuales. Se guarda recién al
            tocar «Guardar estilo».
          </p>
        </div>
      </div>
    </div>
  );
}