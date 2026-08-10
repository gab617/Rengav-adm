import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../../../../services/supabaseClient";
import { useAppContext } from "../../../../contexto/Context";

export function TenantCustomProducts({ dark, tenantId, categories, subcategories, refreshKey }) {
  const { unifiedBrands } = useAppContext();
  const [customs, setCustoms] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [pendingDelete, setPendingDelete] = useState([]);
  const [pendingPrincipal, setPendingPrincipal] = useState(null);
  const [assignRows, setAssignRows] = useState([]);
  const [notification, setNotification] = useState(null);
  const [gallery, setGallery] = useState({});
  const [collapsedCats, setCollapsedCats] = useState({});
  const [allCollapsed, setAllCollapsed] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [maxImages, setMaxImages] = useState(3);
  const [brokenImg, setBrokenImg] = useState(new Set());
  const gridRef = useRef(null);
  const firstPositions = useRef({});

  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubcategoryId, setFormSubcategoryId] = useState("");
  const [formBrandInput, setFormBrandInput] = useState("");

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`;

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const publicUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: tenantUsers } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("tenant_id", tenantId);

      const { data: tenantInfo } = await supabase
        .from("tenants")
        .select("max_product_images")
        .eq("id", tenantId)
        .single();
      if (tenantInfo?.max_product_images) {
        setMaxImages(tenantInfo.max_product_images);
      }

      const tenantUserIds = tenantUsers?.map((u) => u.id) || [];
      const names = {};
      tenantUsers?.forEach((u) => {
        names[u.id] = u.name;
      });
      setUserNames(names);

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

      const { data: assignData } = await supabase
        .from("user_products")
        .select("id, user_id, custom_id, imagenes")
        .in("custom_id", customsList.map((c) => c.id))
        .in("user_id", tenantUserIds);

      const assignMap = {};
      assignData?.forEach((a) => {
        if (!assignMap[a.custom_id]) assignMap[a.custom_id] = [];
        assignMap[a.custom_id].push(names[a.user_id] || "Usuario");
      });
      setAssignments(assignMap);

      const assignRowsList = (assignData || []).map((a) => ({
        id: a.id,
        custom_id: a.custom_id,
        imagenes: a.imagenes || [],
      }));
      setAssignRows(assignRowsList);

      const galleryMap = {};
      customsList.forEach((c) => {
        galleryMap[c.id] =
          c.image_url && !c.image_url.startsWith("http") ? [c.image_url] : [];
      });
      assignRowsList.forEach((r) => {
        if (!galleryMap[r.custom_id]) return;
        r.imagenes.forEach((p) => {
          if (p && !galleryMap[r.custom_id].includes(p)) {
            galleryMap[r.custom_id].push(p);
          }
        });
      });
      setGallery(galleryMap);

      setBrokenImg(new Set());

      setCustoms(customsList);
    } catch (err) {
      console.error("Error cargando customs del tenant:", err);
      showNotification("Error cargando productos custom", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId, showNotification]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const brandName = (c) => c.brands?.name || c.brand_text || null;

  const groups = useMemo(() => {
    const map = {};
    customs.forEach((c) => {
      const name = c.categories?.name || "(Sin categoría)";
      if (!map[name]) map[name] = [];
      map[name].push(c);
    });
    return Object.entries(map)
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => {
        if (a.name === "(Sin categoría)") return 1;
        if (b.name === "(Sin categoría)") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [customs]);

  const toggleCat = (name) => {
    if (allCollapsed) {
      const todosPlegados = {};
      groups.forEach((g) => {
        todosPlegados[g.name] = true;
      });
      todosPlegados[name] = false;
      setCollapsedCats(todosPlegados);
      setAllCollapsed(false);
    } else {
      setCollapsedCats((prev) => ({ ...prev, [name]: !prev[name] }));
    }
  };

  const toggleAll = () => {
    setCollapsedCats({});
    setAllCollapsed((v) => !v);
  };

  const isCollapsed = (name) =>
    allCollapsed ? true : !!collapsedCats[name];

  const openLightbox = (customId, index) => {
    const imgs = (gallery[customId] || []).map(publicUrl);
    if (!imgs.length) return;
    setLightbox({ imgs, index });
  };

  const prevImage = () =>
    setLightbox((l) =>
      l ? { ...l, index: (l.index - 1 + l.imgs.length) % l.imgs.length } : null
    );

  const nextImage = () =>
    setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.imgs.length } : null));

  const editingCustom = useMemo(
    () => customs.find((c) => c.id === editingId) || null,
    [customs, editingId]
  );

  const formSubcategories = useMemo(() => {
    if (!formCategoryId) return [];
    return subcategories.filter(
      (s) => String(s.category_id) === String(formCategoryId)
    );
  }, [formCategoryId, subcategories]);

  const formBrands = useMemo(() => {
    if (!formCategoryId) return [];
    return unifiedBrands.filter((b) =>
      b.category_ids.includes(Number(formCategoryId))
    );
  }, [formCategoryId, unifiedBrands]);

  const newImagePreview = useMemo(
    () => (editingImage ? URL.createObjectURL(editingImage) : null),
    [editingImage]
  );

  const editGallery = useMemo(() => {
    if (!editingId) return [];
    const base = gallery[editingId] || [];
    const restantes = base.filter((p) => !pendingDelete.includes(p));
    let lista = [];
    if (newImagePreview) lista.push(newImagePreview);
    if (pendingPrincipal) {
      lista = [
        ...lista,
        pendingPrincipal,
        ...restantes.filter((p) => p !== pendingPrincipal),
      ];
    } else {
      lista = [...lista, ...restantes];
    }
    return lista;
  }, [gallery, editingId, pendingDelete, pendingPrincipal, newImagePreview]);

  const canAdd = editGallery.length < maxImages;

  const markDelete = (path) => {
    setPendingDelete((prev) =>
      prev.includes(path) ? prev : [...prev, path]
    );
    setPendingPrincipal((p) => (p === path ? null : p));
  };

  const handlePromote = (path) => {
    if (!gridRef.current) return;
    firstPositions.current = {};
    gridRef.current.querySelectorAll("[data-img]").forEach((el) => {
      firstPositions.current[el.dataset.img] = el.getBoundingClientRect();
    });
    setPendingPrincipal(path);
  };

  useLayoutEffect(() => {
    if (!gridRef.current) return;
    gridRef.current.querySelectorAll("[data-img]").forEach((el) => {
      const first = firstPositions.current[el.dataset.img];
      if (!first) return;
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (dx === 0 && dy === 0) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.getBoundingClientRect();
      el.style.transition = "transform 300ms ease";
      el.style.transform = "";
    });
    firstPositions.current = {};
  }, [editGallery]);

  const startEdit = (c) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormCategoryId(c.category_id ? String(c.category_id) : "");
    setFormSubcategoryId(c.subcategory_id ? String(c.subcategory_id) : "");
    setFormBrandInput(brandName(c) || "");
    setEditingImage(null);
    setPendingDelete([]);
    setPendingPrincipal(null);
    setBrokenImg(new Set());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingImage(null);
    setPendingDelete([]);
    setPendingPrincipal(null);
    setBrokenImg(new Set());
  };

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingCustom) return;

    if (!formName.trim() || !formCategoryId) {
      showNotification("Nombre y categoría son obligatorios", "warning");
      return;
    }

    const base = gallery[editingCustom.id] || [];
    const restantes = base.filter((p) => !pendingDelete.includes(p));

    if (editingImage && restantes.length >= maxImages) {
      showNotification(`Máximo ${maxImages} imágenes por producto`, "warning");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = editingCustom.image_url;
      let nuevoPath = null;

      if (editingImage) {
        const fileName = `${Date.now()}-${editingImage.name.replace(/[^\w.-]/g, "_")}`;
        nuevoPath = `${tenantId}/customs/${editingCustom.id}/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(nuevoPath, editingImage);

        if (uploadErr) throw uploadErr;
      }

      const filas = (assignRows || []).filter(
        (r) => r.custom_id === editingCustom.id
      );
      const filasActualizadas = filas.map((r) => ({
        ...r,
        imagenes: (r.imagenes || []).filter(
          (p) => !pendingDelete.includes(p)
        ),
      }));

      const futura = nuevoPath
        ? [nuevoPath, ...restantes]
        : restantes;
      const live = new Set(futura);
      filasActualizadas.forEach((r) =>
        (r.imagenes || []).forEach((p) => live.add(p))
      );

      if (editingImage) {
        imageUrl = nuevoPath;
      } else if (pendingPrincipal && live.has(pendingPrincipal)) {
        imageUrl = pendingPrincipal;
      } else if (pendingDelete.includes(imageUrl)) {
        imageUrl = futura[0] || null;
      }

      const marcaEnCatalogo = formBrands.find(
        (b) => b.label?.toLowerCase() === formBrandInput.trim().toLowerCase()
      );

      const { error } = await supabase
        .from("user_custom_products")
        .update({
          name: formName.trim(),
          brand_id: marcaEnCatalogo?.brand_id ?? null,
          brand_text: marcaEnCatalogo ? null : formBrandInput.trim() || null,
          category_id: Number(formCategoryId),
          subcategory_id: formSubcategoryId ? Number(formSubcategoryId) : null,
          image_url: imageUrl,
        })
        .eq("id", editingCustom.id);

      if (error) throw error;

      const updates = [];
      filas.forEach((r, idx) => {
        const nuevo = filasActualizadas[idx].imagenes;
        if (nuevo.length !== (r.imagenes || []).length) {
          updates.push(
            supabase
              .from("user_products")
              .update({ imagenes: nuevo })
              .eq("id", r.id)
          );
        }
      });
      if (updates.length) {
        const resultados = await Promise.all(updates);
        const errUpd = resultados.find((r) => r.error);
        if (errUpd) throw errUpd.error;
      }

      const viejos = new Set(base);
      if (
        editingCustom.image_url &&
        !editingCustom.image_url.startsWith("http")
      ) {
        viejos.add(editingCustom.image_url);
      }
      const paraBorrar = [...viejos].filter(
        (p) => !live.has(p) && !p.startsWith("http")
      );
      if (paraBorrar.length) {
        const { error: removeErr } = await supabase.storage
          .from("product-images")
          .remove(paraBorrar);
        if (removeErr) throw removeErr;
      }

      showNotification(`"${formName.trim()}" actualizado`);
      cancelEdit();
      await load();
    } catch (err) {
      console.error("Error editando custom:", err);
      showNotification("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-40 ${textSecondary}`}>
        <div className="animate-pulse">Cargando productos custom...</div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${bgCard}`}>
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

      <div className={`p-4 border-b flex items-start justify-between gap-3 ${dark ? "border-gray-700" : "border-gray-200"}`}>
        <div>
          <h2 className={`font-semibold text-lg ${textPrimary}`}>
            ⭐ Productos custom del negocio
          </h2>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            Productos propios del tenant. Se comparten entre los usuarios del
            negocio; los precios y el stock se manejan por usuario en Asignar.
          </p>
        </div>
        {customs.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              dark
                ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {allCollapsed ? "▼ Desplegar todos" : "▶ Plegar todos"}
          </button>
        )}
      </div>

      {customs.length === 0 ? (
        <div className={`text-center py-10 ${textSecondary}`}>
          <div className="text-4xl mb-3">⭐</div>
          <p>Este negocio todavía no tiene productos custom</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {groups.map((g) => {
            const collapsed = isCollapsed(g.name);
            return (
              <div
                key={g.name}
                className={`rounded-xl border overflow-hidden ${bgCard}`}
              >
                <button
                  type="button"
                  onClick={() => toggleCat(g.name)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 transition-colors ${
                    dark
                      ? "bg-purple-500/10 hover:bg-purple-500/20"
                      : "bg-purple-50 hover:bg-purple-100"
                  }`}
                >
                  <span className={`font-semibold text-sm ${textPrimary}`}>
                    📁 {g.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        dark
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      {g.items.length}
                    </span>
                    <span className={`text-xs ${textSecondary}`}>
                      {collapsed ? "▶" : "▼"}
                    </span>
                  </span>
                </button>
                {!collapsed && (
                  <div className="p-3 space-y-2">
                    {g.items.map((c) => {
                      const asignados = assignments[c.id] || [];
                      const totalImgs = gallery[c.id]?.length || 0;

                      return (
                        <div key={c.id} className={`rounded-xl border ${bgCard}`}>
                          <div className="flex flex-wrap md:flex-nowrap md:items-center items-center gap-3 p-3">
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
                              </div>
                              <p className={`text-xs mt-1 ${textSecondary}`}>
                                {userNames[c.user_id] ? `👤 ${userNames[c.user_id]} · ` : ""}
                                {asignados.length > 0
                                  ? `Asignado a: ${asignados.join(", ")}`
                                  : "Sin asignar"}
                              </p>
                            </div>

                            <button
                              onClick={() => startEdit(c)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors shrink-0 order-2 md:order-3"
                            >
                              ✏️ Editar
                            </button>

                            <div
                              className={`flex gap-1.5 p-1 overflow-hidden w-full md:w-auto md:max-w-[45%] order-3 md:order-2 ${
                                dark ? "border-gray-700" : "border-gray-200"
                              }`}
                            >
                              {totalImgs > 0 ? (
                                gallery[c.id].map((u, i) => (
                                  <img
                                    key={u}
                                    src={publicUrl(u)}
                                    alt=""
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                    onClick={() => openLightbox(c.id, i)}
                                    className={`w-12 h-12 rounded-md object-cover shrink-0 cursor-pointer transition-transform hover:scale-105 border ${
                                      dark ? "border-gray-600" : "border-gray-300"
                                    }`}
                                  />
                                ))
                              ) : (
                                <div
                                  className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 ${
                                    dark ? "bg-gray-700" : "bg-gray-100"
                                  }`}
                                >
                                  <span className="text-xl">🛒</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {editingCustom?.id === c.id && (
                            <div
                              className="fixed inset-0 z-50 bg-black/60 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
                              onClick={cancelEdit}
                            >
                              <div
                                className={`relative w-full max-w-lg my-2 max-h-[90vh] overflow-y-auto rounded-2xl border ${bgCard} p-4 sm:p-5`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between gap-3 mb-4">
                                  <h3 className={`font-semibold text-lg ${textPrimary}`}>
                                    ✏️ Editar producto
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className={`px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                                      dark
                                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    ✕
                                  </button>
                                </div>
                                <form
                                  onSubmit={handleSaveEdit}
                                  className="space-y-3"
                                >
                              <input
                                type="text"
                                placeholder="Nombre del producto"
                                className={inputClass}
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                required
                              />

                              <select
                                value={formCategoryId}
                                onChange={(e) => {
                                  setFormCategoryId(e.target.value);
                                  setFormSubcategoryId("");
                                  setFormBrandInput("");
                                }}
                                className={inputClass}
                                required
                              >
                                <option value="">Seleccionar categoría</option>
                                {categories.map((c2) => (
                                  <option key={c2.id} value={c2.id}>
                                    {c2.name}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={formSubcategoryId}
                                onChange={(e) => setFormSubcategoryId(e.target.value)}
                                className={`${inputClass} ${!formCategoryId ? "opacity-50" : ""}`}
                                disabled={!formCategoryId}
                              >
                                <option value="">
                                  {formCategoryId
                                    ? "Seleccionar subcategoría"
                                    : "Elegir categoría primero"}
                                </option>
                                {formSubcategories.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>

                              <div>
                                <input
                                  list="marcas-edit-custom"
                                  value={formBrandInput}
                                  onChange={(e) => setFormBrandInput(e.target.value)}
                                  placeholder="Marca (opcional)"
                                  className={inputClass}
                                  disabled={!formCategoryId}
                                />
                                <datalist id="marcas-edit-custom">
                                  {formBrands.map((b) => (
                                    <option key={b.key} value={b.label} />
                                  ))}
                                </datalist>
                                <p className={`text-[10px] mt-1 ${textSecondary}`}>
                                  Si la marca no está en el catálogo, se guarda como marca
                                  propia del producto.
                                </p>
                              </div>

                              <div>
                                <label className={`block text-xs font-medium mb-1 flex items-center gap-2 ${textSecondary}`}>
                                  Galería del producto
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                                      dark
                                        ? "bg-gray-700 text-gray-300"
                                        : "bg-gray-200 text-gray-600"
                                    }`}
                                  >
                                    {editGallery.length}/{maxImages}
                                  </span>
                                </label>
                                <p className={`text-[10px] mb-2 ${textSecondary}`}>
                                  La primera imagen es la principal. Si eliminás
                                  la principal, la siguiente toma su lugar.
                                </p>

                                {editGallery.length > 0 && (
                                  <div
                                    ref={gridRef}
                                    className="flex flex-wrap gap-2 items-start mb-3"
                                  >
                                    {editGallery.map((path, i) => {
                                      const esNueva =
                                        !!editingImage && i === 0;
                                      const isPrincipal = i === 0;
                                      const esRota = brokenImg.has(path);
                                      return (
                                        <div
                                          key={path}
                                          data-img={path}
                                          className={`relative rounded-lg overflow-hidden border will-change-transform flex items-center justify-center min-h-28 min-w-28 ${
                                            isPrincipal
                                              ? "ring-2 ring-blue-500 border-blue-500"
                                              : esRota
                                                ? "border-red-500 ring-2 ring-red-500/50"
                                                : dark
                                                  ? "border-gray-600"
                                                  : "border-gray-300"
                                          }`}
                                        >
                                          <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-30">📷</span>
                                          <img
                                            src={publicUrl(path)}
                                            alt=""
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none";
                                              setBrokenImg((prev) => new Set(prev).add(path));
                                            }}
                                            className="relative max-h-28 w-auto h-auto max-w-[240px]"
                                          />
                                          <span
                                            className={`absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                              isPrincipal
                                                ? "bg-blue-600 text-white"
                                                : "bg-black/50 text-white"
                                            }`}
                                          >
                                            {isPrincipal
                                              ? esNueva
                                                ? "Nueva principal"
                                                : "Principal"
                                              : `#${i + 1}`}
                                          </span>
                                          {esRota && (
                                            <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-red-600 text-white">
                                              sin archivo
                                            </span>
                                          )}
                                          <div className="absolute top-1 right-1 flex gap-1">
                                            {!isPrincipal && !editingImage && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handlePromote(path)
                                                }
                                                title="Marcar como principal"
                                                className="w-6 h-6 rounded bg-black/50 text-white text-xs hover:bg-blue-600 flex items-center justify-center"
                                              >
                                                ⭐
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() =>
                                                esNueva
                                                  ? setEditingImage(null)
                                                  : markDelete(path)
                                              }
                                              title={
                                                esNueva
                                                  ? "Quitar la imagen nueva"
                                                  : "Eliminar imagen"
                                              }
                                              className="w-6 h-6 rounded bg-black/50 text-white text-xs hover:bg-red-600 flex items-center justify-center"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {pendingDelete.length > 0 && (
                                  <div
                                    className={`mb-3 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                                      dark
                                        ? "bg-red-500/20 text-red-400"
                                        : "bg-red-50 text-red-600"
                                    }`}
                                  >
                                    <span>
                                      Se eliminarán {pendingDelete.length}{" "}
                                      imagen
                                      {pendingDelete.length > 1 ? "es" : ""}{" "}
                                      al guardar
                                      {pendingDelete.includes(
                                        editingCustom.image_url
                                      ) && " · la siguiente será la principal"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setPendingDelete([])}
                                      className="underline font-medium shrink-0"
                                    >
                                      Deshacer
                                    </button>
                                  </div>
                                )}

                                {canAdd ? (
                                  <label
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors bg-blue-600 text-white hover:bg-blue-500"
                                  >
                                    📷 Agregar imagen
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setEditingImage(file);
                                      }}
                                    />
                                  </label>
                                ) : (
                                  <p
                                    className={`text-xs font-medium ${
                                      dark ? "text-gray-400" : "text-gray-500"
                                    }`}
                                  >
                                    Límite de {maxImages} imágenes alcanzado
                                  </p>
                                )}
                                {editingImage && (
                                  <p className={`text-xs mt-1 ${textSecondary}`}>
                                    Se subirá como nueva principal:{" "}
                                    {editingImage.name}
                                  </p>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
                              >
                                {saving ? "Guardando..." : "💾 Guardar cambios"}
                              </button>
                                </form>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.imgs[lightbox.index]}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {lightbox.imgs.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/25 flex items-center justify-center"
                  aria-label="Anterior"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/25 flex items-center justify-center"
                  aria-label="Siguiente"
                >
                  ▶
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-gray-800 text-white hover:bg-gray-600 flex items-center justify-center border border-white/20"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
              {lightbox.index + 1} / {lightbox.imgs.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
