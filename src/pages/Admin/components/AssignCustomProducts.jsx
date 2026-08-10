import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { ProductImagesEditor } from "../../usuario/components/ProductImagesEditor";

export function AssignCustomProducts({ selectedUser, dark, onCountChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customs, setCustoms] = useState([]);
  const [assignedData, setAssignedData] = useState([]);
  const [selected, setSelected] = useState({});
  const [activeTab, setActiveTab] = useState("asignar");
  const [notification, setNotification] = useState(null);
  const [editData, setEditData] = useState({});
  const [defaultPrices, setDefaultPrices] = useState({});

  const baseCard = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white" : "bg-gray-50";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const assignedCustomIds = useMemo(
    () => new Set(assignedData.map((a) => a.custom_id)),
    [assignedData]
  );

  const disponibles = useMemo(
    () => customs.filter((c) => !assignedCustomIds.has(c.id)),
    [customs, assignedCustomIds]
  );

  const activos = useMemo(
    () => assignedData.filter((a) => a.active !== false),
    [assignedData]
  );

  const inactivos = useMemo(
    () => assignedData.filter((a) => a.active === false),
    [assignedData]
  );

  const load = useCallback(async () => {
    if (!selectedUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const tenantId = selectedUser.tenant_id;

      if (!tenantId) {
        setCustoms([]);
        setAssignedData([]);
        setLoading(false);
        return;
      }

      const { data: tenantUsers } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("tenant_id", tenantId);

      const tenantUserIds = tenantUsers?.map((u) => u.id) || [];
      const userNames = {};
      tenantUsers?.forEach((u) => {
        userNames[u.id] = u.name;
      });

      const { data: customsData } = await supabase
        .from("user_custom_products")
        .select(
          `
            id,
            user_id,
            name,
            brand_id,
            brand_text,
            image_url,
            category_id,
            subcategory_id,
            brands ( id, name ),
            categories ( id, name ),
            subcategories ( id, name )
          `
        )
        .in("user_id", tenantUserIds)
        .order("name");

      const customsList = customsData || [];

      const [assignedRes, countRes, tenantUpRes] = await Promise.all([
        supabase
          .from("user_products")
          .select("id, custom_id, precio_venta, precio_compra, stock, descripcion, active, imagenes")
          .eq("user_id", selectedUser.id)
          .not("custom_id", "is", null),
        supabase
          .from("user_products")
          .select("id", { count: "exact" })
          .eq("user_id", selectedUser.id),
        supabase
          .from("user_products")
          .select("custom_id, user_id, precio_compra, precio_venta, stock")
          .in("custom_id", customsList.map((c) => c.id)),
      ]);

      // Precios "default": los del CREADOR del custom (quien lo creó
      // los dejó en su user_products). Si el creador no tiene fila, se
      // usa cualquier otra fila del negocio como referencia.
      const defaultMap = {};
      tenantUpRes?.data?.forEach((up) => {
        if (!defaultMap[up.custom_id]) defaultMap[up.custom_id] = up;
      });
      customsList.forEach((c) => {
        const creadorUp = tenantUpRes?.data?.find(
          (up) => up.custom_id === c.id && up.user_id === c.user_id
        );
        if (creadorUp) defaultMap[c.id] = creadorUp;
      });
      setDefaultPrices(defaultMap);

      setCustoms(customsList.map((c) => ({ ...c, creador: userNames[c.user_id] || null })));
      setAssignedData(assignedRes.data || []);
      setSelected({});
      onCountChange?.(selectedUser.id, countRes.count || 0);
    } catch (err) {
      console.error("Error cargando customs:", err);
      showNotification("Error cargando productos custom", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedUser, showNotification, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const publicUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const brandName = (c) => c.brands?.name || c.brand_text || null;

  const toggleSelect = (customId) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[customId]) {
        delete next[customId];
      } else {
        const def = defaultPrices[customId];
        next[customId] = {
          precio_compra: def?.precio_compra ?? "",
          precio_venta: def?.precio_venta ?? "",
          stock: def?.stock ?? "",
        };
      }
      return next;
    });
  };

  const updateField = (customId, field, value) => {
    setSelected((prev) => ({
      ...prev,
      [customId]: { ...prev[customId], [field]: value },
    }));
  };

  useEffect(() => {
    const next = {};
    assignedData.forEach((a) => {
      next[a.id] = {
        precio_venta: a.precio_venta ?? 0,
        precio_compra: a.precio_compra ?? 0,
        stock: a.stock ?? 0,
        descripcion: a.descripcion ?? "",
        imagenes: a.imagenes || [],
      };
    });
    setEditData(next);
  }, [assignedData]);

  const updateEditField = (upId, field, value) => {
    setEditData((prev) => ({
      ...prev,
      [upId]: { ...prev[upId], [field]: value },
    }));
  };

  async function handleSaveEdit(upId) {
    const data = editData[upId];
    if (!data) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("user_products")
        .update({
          precio_venta: Number(data.precio_venta) || 0,
          precio_compra: Number(data.precio_compra) || 0,
          stock: Number(data.stock) || 0,
          descripcion: data.descripcion || null,
          imagenes: data.imagenes || [],
        })
        .eq("id", upId);

      if (error) throw error;

      showNotification("Producto actualizado");
      await load();
    } catch (err) {
      console.error("Error actualizando producto:", err);
      showNotification("Error al actualizar el producto", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAsignar() {
    const ids = Object.keys(selected);
    if (!selectedUser?.id || ids.length === 0) return;

    setSaving(true);

    try {
      const rows = ids.map((customId) => ({
        user_id: selectedUser.id,
        custom_id: customId,
        precio_compra: Number(selected[customId].precio_compra) || 0,
        precio_venta: Number(selected[customId].precio_venta) || 0,
        stock: Number(selected[customId].stock) || 0,
        active: true,
      }));

      const { error } = await supabase.from("user_products").insert(rows);

      if (error) {
        if (error.code === "23505") {
          showNotification(
            "Algunos productos ya estaban asignados a este usuario",
            "warning"
          );
        } else {
          throw error;
        }
      } else {
        showNotification(`${rows.length} producto(s) asignado(s)`);
      }

      await load();
    } catch (err) {
      console.error("Error asignando customs:", err);
      showNotification("Error al asignar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(upId, active) {
    try {
      const { error } = await supabase
        .from("user_products")
        .update(active ? { active: true } : { active: false, stock: 0 })
        .eq("id", upId);

      if (error) throw error;

      showNotification(active ? "Producto reactivado" : "Producto desactivado");
      await load();
    } catch (err) {
      console.error("Error actualizando estado:", err);
      showNotification("Error al actualizar el producto", "error");
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse text-xl">Cargando productos custom...</div>
      </div>
    );
  }

  if (!selectedUser?.tenant_id) {
    return (
      <div className={`text-center py-12 ${textSecondary}`}>
        <div className="text-5xl mb-4">🏪</div>
        <p>Este usuario no tiene un negocio asignado</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white transform transition-all duration-300 ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "warning"
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
        >
          {notification.msg}
        </div>
      )}

      <div className={`flex gap-1 md:gap-2 mb-3 md:mb-4 p-1 rounded-xl ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
        <button
          onClick={() => setActiveTab("asignar")}
          className={`flex-1 py-2 px-2 md:px-4 rounded-lg font-medium transition-all text-xs md:text-sm ${
            activeTab === "asignar"
              ? "bg-blue-500 text-white shadow"
              : `${textSecondary} hover:${textPrimary}`
          }`}
        >
          ➕ Asignar ({disponibles.length})
        </button>
        <button
          onClick={() => setActiveTab("asignados")}
          className={`flex-1 py-2 px-2 md:px-4 rounded-lg font-medium transition-all text-xs md:text-sm ${
            activeTab === "asignados"
              ? "bg-red-500 text-white shadow"
              : `${textSecondary} hover:${textPrimary}`
          }`}
        >
          📋 Asignados ({activos.length})
        </button>
      </div>

      {activeTab === "asignar" ? (
        <>
          <div className={`rounded-xl p-3 mb-4 ${baseCard} border`}>
            <p className={`text-sm ${textSecondary}`}>
              Productos custom creados en el negocio de{" "}
              <b className={textPrimary}>{selectedUser.name}</b>. Elegí los que
              querés asignarle.
            </p>
          </div>

          {disponibles.length === 0 ? (
            <div className={`text-center py-12 ${textSecondary}`}>
              <div className="text-5xl mb-4">⭐</div>
              <p>No hay productos custom disponibles para asignar</p>
              <p className="text-sm mt-1">
                Los custom del negocio se crean desde Productos
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {disponibles.map((c) => {
                const isSelected = !!selected[c.id];
                const img = publicUrl(c.image_url);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/10"
                        : `${baseCard} hover:border-blue-400`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {img ? (
                        <img
                          src={img}
                          alt={c.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                            dark ? "bg-gray-700" : "bg-gray-100"
                          }`}
                        >
                          <span className="text-xl">🛒</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${textPrimary}`}>
                          {c.name}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {brandName(c) && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                dark
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {brandName(c)}
                            </span>
                          )}
                          {c.categories?.name && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                dark
                                  ? "bg-purple-500/20 text-purple-400"
                                  : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {c.categories.name}
                            </span>
                          )}
                          {c.creador && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                dark
                                  ? "bg-gray-700 text-gray-400"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              👤 {c.creador}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-blue-500/30 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${textSecondary}`}>Compra</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="$0"
                            value={selected[c.id]?.precio_compra || ""}
                            onChange={(e) =>
                              updateField(c.id, "precio_compra", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className={`w-20 p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${textSecondary}`}>Venta</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="$0"
                            value={selected[c.id]?.precio_venta || ""}
                            onChange={(e) =>
                              updateField(c.id, "precio_venta", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className={`w-20 p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${textSecondary}`}>Stock</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={selected[c.id]?.stock || ""}
                            onChange={(e) =>
                              updateField(c.id, "stock", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className={`w-16 p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {Object.keys(selected).length > 0 && (
            <div className={`fixed bottom-0 left-0 right-0 p-4 ${dark ? "bg-gray-900 border-t border-gray-800" : "bg-white border-t border-gray-200"} shadow-2xl z-40`}>
              <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                <div>
                  <div className={`font-bold text-lg ${textPrimary}`}>
                    {Object.keys(selected).length} producto(s)
                  </div>
                  <div className={`text-sm ${textSecondary}`}>
                    → {selectedUser.name}
                  </div>
                </div>
                <button
                  onClick={handleAsignar}
                  disabled={saving}
                  className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-600 transition-colors"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin">⟳</span> Asignando...
                    </>
                  ) : (
                    <>
                      <span>✓</span> Asignar {Object.keys(selected).length}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {activos.length === 0 && inactivos.length === 0 ? (
            <div className={`text-center py-12 ${textSecondary}`}>
              <div className="text-5xl mb-4">📦</div>
              <p>No hay productos custom asignados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activos.map((a) => {
                const c = customs.find((x) => x.id === a.custom_id);
                const ed = editData[a.id];
                const img = publicUrl(
                  ed?.imagenes?.[0] || a.imagenes?.[0] || c?.image_url
                );
                const compra = Number(ed?.precio_compra) || 0;
                const venta = Number(ed?.precio_venta) || 0;
                const compraMayorVenta = compra > 0 && venta > 0 && compra > venta;

                return (
                  <div
                    key={a.id}
                    className={`p-4 rounded-xl border ${baseCard}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {img ? (
                          <img
                            src={img}
                            alt={c?.name || "Producto"}
                            className="w-10 h-10 rounded-lg object-cover border shrink-0"
                            style={{ borderColor: dark ? "#4b5563" : "#e5e7eb" }}
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-lg border shrink-0 flex items-center justify-center ${dark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"}`}
                          >
                            <span className="text-lg">🛒</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${textPrimary}`}>
                            {c?.name || "Producto desconocido"}
                          </p>
                          <p className={`text-xs ${textSecondary}`}>
                            {brandName(c) || "Sin marca"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleActive(a.id, false)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors shrink-0"
                      >
                        🚫 Desactivar
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-600/20 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Compra</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ed?.precio_compra ?? ""}
                          onChange={(e) => updateEditField(a.id, "precio_compra", e.target.value)}
                          className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Venta</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ed?.precio_venta ?? ""}
                          onChange={(e) => updateEditField(a.id, "precio_venta", e.target.value)}
                          className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Stock</label>
                        <input
                          type="number"
                          value={ed?.stock ?? ""}
                          onChange={(e) => updateEditField(a.id, "stock", e.target.value)}
                          className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      <div className="col-span-2 md:col-span-4">
                        <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Descripción</label>
                        <input
                          type="text"
                          value={ed?.descripcion ?? ""}
                          onChange={(e) => updateEditField(a.id, "descripcion", e.target.value)}
                          placeholder="Descripción del producto"
                          className={`w-full p-1.5 rounded border text-xs ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                    </div>

                    {compraMayorVenta && (
                      <div
                        className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                          dark
                            ? "bg-red-500/20 text-red-400"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        ⚠️ El precio de compra (${compra}) es mayor que el de
                        venta (${venta})
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-600/20">
                      <ProductImagesEditor
                        tenantId={selectedUser.tenant_id}
                        productId={a.id}
                        imagenes={ed?.imagenes || []}
                        onImagenesChange={(nuevas) =>
                          updateEditField(a.id, "imagenes", nuevas)
                        }
                        dark={dark}
                      />
                      <p className={`text-[10px] mt-1 ${textSecondary}`}>
                        La imagen que se agrega acá es propia de{" "}
                        <b className={textPrimary}>{selectedUser.name}</b>. Si
                        no hay imagen propia, se muestra la imagen general del
                        producto.
                      </p>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => handleSaveEdit(a.id)}
                        disabled={saving}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                      >
                        {saving ? "Guardando..." : "💾 Guardar"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {inactivos.map((a) => {
                const c = customs.find((x) => x.id === a.custom_id);
                const img = publicUrl(c?.image_url);
                return (
                  <div
                    key={a.id}
                    className={`p-4 rounded-xl border flex items-center justify-between ${dark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {img ? (
                        <img
                          src={img}
                          alt={c?.name || "Producto"}
                          className="w-10 h-10 rounded-lg object-cover border shrink-0 opacity-60"
                          style={{ borderColor: dark ? "#4b5563" : "#e5e7eb" }}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-lg border shrink-0 flex items-center justify-center opacity-60 ${dark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"}`}
                        >
                          <span className="text-lg">🛒</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={`font-medium line-through opacity-60 ${textPrimary}`}>
                          {c?.name || "Producto desconocido"}
                        </p>
                        <p className={`text-xs opacity-60 ${textSecondary}`}>
                          {brandName(c) || "Sin marca"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(a.id, true)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition-colors"
                    >
                      ⟳ Reactivar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
