import React, { useEffect, useState } from "react";
import { supabase } from "../../../../../services/supabaseClient";

/**
 * Panel SOLO super admin:
 *  - catálogo global de talles (crear / borrar)
 *  - qué talles aplican a cada categoría (borrador + botón Guardar:
 *    los toggles son estado local y se persisten con UN rpc
 *    category_sizes_set por categoría, anti N+1).
 * Los productos se guardan SU PROPIO subconjunto (products_base.talles),
 * así que borrar un talle del catálogo no rompe productos existentes:
 * simplemente ese talle deja de mostrarse.
 */
export function SizePanel({ dark, categories = [], sizes = [], categorySizes = [], reloadCategories }) {
  const [newSize, setNewSize] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [draftIds, setDraftIds] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notification, setNotification] = useState(null);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-white text-gray-900 border-gray-300";

  const showMsg = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  // Sincroniza el borrador con la base solo cuando NO hay cambios pendientes.
  useEffect(() => {
    if (dirty) return;
    const catId = Number(selectedCatId);
    if (!catId) return;
    const ids = categorySizes
      .filter((cs) => cs.category_id === catId)
      .sort((a, b) => a.position - b.position)
      .map((cs) => cs.size_id);
    setDraftIds(ids);
  }, [categorySizes, selectedCatId, dirty]);

  function handleCatChange(catId) {
    if (dirty && !confirm("Tenés cambios sin guardar en esta categoría. ¿Descartarlos?")) return;
    setSelectedCatId(catId);
    setDirty(false);
  }

  // Toggle SOLO en estado local (cero peticiones); mantiene el orden del catálogo.
  function toggleDraft(sizeId) {
    setDraftIds((prev) => {
      const next = prev.includes(sizeId)
        ? prev.filter((x) => x !== sizeId)
        : [...prev, sizeId];
      return sizes.map((s) => s.id).filter((id) => next.includes(id));
    });
    setDirty(true);
  }

  function discardDraft() {
    setDirty(false);
  }

  async function saveCatSizes() {
    const catId = Number(selectedCatId);
    if (!catId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("category_sizes_set", {
        p_category_id: catId,
        p_size_ids: draftIds,
      });
      if (error) throw error;
      await reloadCategories?.();
      setDirty(false);
      showMsg("Talles de la categoría guardados");
    } catch (err) {
      console.error("Error guardando talles de categoría:", err);
      showMsg("Error al guardar los talles", "error");
    } finally {
      setBusy(false);
    }
  }

  async function addSize() {
    const name = newSize.trim();
    if (!name) return;
    if (sizes.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      showMsg("Ese talle ya existe en el catálogo", "warning");
      return;
    }
    setBusy(true);
    try {
      const nextSort = sizes.length ? Math.max(...sizes.map((s) => s.sort_order || 0)) + 10 : 10;
      const { error } = await supabase
        .from("sizes")
        .insert({ name, sort_order: nextSort });
      if (error) {
        if (error.code === "23505") showMsg("Ese talle ya existe", "warning");
        else throw error;
        return;
      }
      setNewSize("");
      showMsg(`Talle "${name}" agregado`);
      await reloadCategories?.();
    } catch (err) {
      console.error("Error creando talle:", err);
      showMsg("Error al crear el talle", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSize(size) {
    if (!confirm(`¿Borrar el talle "${size.name}"? Los productos que lo usaban ya no lo mostrarán.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("sizes").delete().eq("id", size.id);
      if (error) throw error;
      showMsg(`Talle "${size.name}" borrado`);
      await reloadCategories?.();
    } catch (err) {
      console.error("Error borrando talle:", err);
      showMsg("Error al borrar el talle", "error");
    } finally {
      setBusy(false);
    }
  }

  const catSizeNames = (catId) => {
    const ids = categorySizes
      .filter((cs) => cs.category_id === catId)
      .map((cs) => cs.size_id);
    const names = sizes
      .filter((s) => ids.includes(s.id))
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((s) => s.name);
    return names.length ? names.join(", ") : "Sin talles";
  };

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {notification.msg}
        </div>
      )}

      <div>
        <h2 className={`font-semibold text-lg ${textPrimary}`}>📏 Talles</h2>
        <p className={`text-xs mt-1 ${textSecondary}`}>
          Catálogo global de talles y qué talles aplican a cada categoría.
          Cada producto guarda su propio subconjunto de talles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Catálogo global */}
        <div className={`p-3 rounded-xl border ${dark ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}>
          <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>🌍 Catálogo global</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Nuevo talle (ej: S, 36, Talle único)"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSize()}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputBg}`}
            />
            <button
              onClick={addSize}
              disabled={busy || !newSize.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((s) => (
              <button
                key={s.id}
                onClick={() => deleteSize(s)}
                disabled={busy}
                title="Eliminar talle"
                className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${
                  dark
                    ? "bg-gray-700 text-gray-200 hover:bg-red-500/30 hover:text-red-400"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
                }`}
              >
                {s.name} <span className="opacity-60">✕</span>
              </button>
            ))}
            {!sizes.length && (
              <p className={`text-xs ${textSecondary}`}>Todavía no hay talles en el catálogo.</p>
            )}
          </div>
        </div>

        {/* Asignación por categoría */}
        <div className={`p-3 rounded-xl border ${dark ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}>
          <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>🗂️ Talles por categoría</h3>
          <select
            value={selectedCatId}
            onChange={(e) => handleCatChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${inputBg}`}
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedCatId ? (
            <>
              <p className={`text-xs mb-2 ${textSecondary}`}>
                Elegí qué talles ofrece esta categoría. Los cambios quedan
                pendientes hasta tocar "Guardar" (se envían todos juntos).
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => {
                  const active = draftIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleDraft(s.id)}
                      disabled={busy}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        active
                          ? "bg-blue-500 text-white shadow"
                          : dark
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>

              {dirty && (
                <div className={`mt-3 flex items-center gap-2 flex-wrap p-2.5 rounded-lg border ${dark ? "border-amber-500/40 bg-amber-500/10" : "border-amber-300 bg-amber-50"}`}>
                  <span className={`text-xs font-medium ${dark ? "text-amber-300" : "text-amber-600"}`}>
                    ⚠️ Cambios sin guardar
                  </span>
                  <button
                    onClick={saveCatSizes}
                    disabled={busy}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-500 disabled:opacity-50"
                  >
                    💾 Guardar talles
                  </button>
                  <button
                    onClick={discardDraft}
                    disabled={busy}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
                  >
                    Descartar
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className={`text-xs ${textSecondary}`}>
              Elegí una categoría para configurar sus talles.
            </p>
          )}
        </div>
      </div>

      {/* Resumen por categoría */}
      <div>
        <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>📋 Resumen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className={`px-3 py-2 rounded-lg border text-xs ${dark ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}
            >
              <span className={`font-semibold ${textPrimary}`}>{c.name}</span>
              <span className={`ml-1 ${textSecondary}`}>→ {catSizeNames(c.id)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
