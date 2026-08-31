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
import { SizeSelector } from "./components/SizeSelector";
import { compressImage } from "../../../../utils/compressImage";

export function TenantCustomProducts({ dark, tenantId, categories, subcategories, getSizesByCategory = () => [], sizes = [], refreshKey }) {
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
  const [listBroken, setListBroken] = useState(new Set());
  const [deletingCustom, setDeletingCustom] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [papeleraOpen, setPapeleraOpen] = useState(false);
  const [papeleraItems, setPapeleraItems] = useState([]);
  const [papeleraLoading, setPapeleraLoading] = useState(false);
  const [restaurandoId, setRestaurandoId] = useState(null);
  const [papeleraBroken, setPapeleraBroken] = useState(new Set());
  const gridRef = useRef(null);
  const firstPositions = useRef({});

  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubcategoryId, setFormSubcategoryId] = useState("");
  const [formBrandInput, setFormBrandInput] = useState("");
  const [formTalles, setFormTalles] = useState([]);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`;
  const rowHover = dark ? "hover:bg-gray-700/50" : "hover:bg-gray-50";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

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
            talles,
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
      setListBroken(new Set());

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
    setFormTalles(c.talles || []);
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
    setFormTalles([]);
    setBrokenImg(new Set());
  };

  const cargarPapelera = useCallback(async () => {
    if (!tenantId) return;
    setPapeleraLoading(true);
    try {
      const { data, error } = await supabase.rpc("custom_papelera", {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPapeleraItems(data?.items || []);
      setPapeleraBroken(new Set());
    } catch (err) {
      console.error("Error cargando papelera:", err);
      showNotification("Error cargando la papelera", "error");
    } finally {
      setPapeleraLoading(false);
    }
  }, [tenantId, showNotification]);

  const togglePapelera = () => {
    const abrir = !papeleraOpen;
    setPapeleraOpen(abrir);
    if (abrir) cargarPapelera();
  };

  // El RPC desarma la cadena en orden: suelta ventas -> borra
  // asignaciones -> deleted_at. Imágenes del bucket intactas para
  // que el revival conserve fotos.
  const handleEliminarConfirm = async () => {
    if (!deletingCustom || eliminando) return;
    setEliminando(true);
    try {
      const { data, error } = await supabase.rpc("custom_eliminar", {
        p_custom_id: deletingCustom.id,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showNotification(`"${deletingCustom.name}" enviado a la papelera`);
      setDeletingCustom(null);
      await load();
      if (papeleraOpen) await cargarPapelera();
    } catch (err) {
      console.error("Error eliminando custom:", err);
      showNotification("Error al eliminar el producto", "error");
    } finally {
      setEliminando(false);
    }
  };

  const handleRestaurar = async (item) => {
    if (restaurandoId) return;
    setRestaurandoId(item.id);
    try {
      const { data, error } = await supabase.rpc("custom_restaurar", {
        p_custom_id: item.id,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showNotification(`"${item.name}" restaurado`);
      setPapeleraItems((prev) => prev.filter((i) => i.id !== item.id));
      await load();
    } catch (err) {
      console.error("Error restaurando custom:", err);
      showNotification("Error al restaurar", "error");
    } finally {
      setRestaurandoId(null);
    }
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
        const compressed = await compressImage(editingImage);
        const fileName = `${Date.now()}-image.jpg`;
        nuevoPath = `${tenantId}/customs/${editingCustom.id}/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(nuevoPath, compressed, { contentType: "image/jpeg" });

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
          talles: formTalles.map(Number),
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

      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-x-3 gap-y-2 ${borderColor}`}>
        <div className="min-w-0">
          <h2 className={`font-semibold text-base ${textPrimary}`}>
            ⭐ Productos custom del negocio
          </h2>
          <p className={`text-xs mt-0.5 ${textSecondary}`}>
            Solo este negocio · compartidos por todos sus vendedores. Cada uno
            define su precio y stock en "Asignar".
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {customs.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              title={allCollapsed ? "Desplegar todas las categorías" : "Plegar todas las categorías"}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dark
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {allCollapsed ? "▼ Desplegar" : "▲ Plegar"}
            </button>
          )}
          <button
            type="button"
            onClick={togglePapelera}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              papeleraOpen
                ? dark
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-red-100 text-red-600 hover:bg-red-200"
                : dark
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🗑️ Papelera
            {!papeleraLoading && papeleraItems.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  papeleraOpen
                    ? "bg-red-500 text-white"
                    : dark
                      ? "bg-red-500/20 text-red-400"
                      : "bg-red-100 text-red-600"
                }`}
              >
                {papeleraItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {papeleraOpen && (
        <div className={`px-4 py-3 border-b space-y-1.5 ${borderColor}`}>
          <p className={`text-xs ${textSecondary}`}>
            Estos productos no aparecen en ningún catálogo ni se pueden
            asignar. Restaurarlos los devuelve a la lista, sin sus
            asignaciones anteriores.
          </p>
          {papeleraLoading ? (
            <div className={`py-3 text-center animate-pulse ${textSecondary}`}>
              Cargando papelera...
            </div>
          ) : papeleraItems.length === 0 ? (
            <div className={`py-3 text-center ${textSecondary}`}>
              La papelera está vacía
            </div>
          ) : (
            papeleraItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${
                  dark ? "bg-gray-700/40" : "bg-gray-50"
                }`}
              >
                {item.image_url && !papeleraBroken.has(item.id) ? (
                  <img
                    src={publicUrl(item.image_url)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      setPapeleraBroken((prev) => new Set(prev).add(item.id));
                    }}
                    className={`w-10 h-10 rounded-md object-cover shrink-0 border ${
                      dark ? "border-gray-600 opacity-60" : "border-gray-300 opacity-60"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 opacity-60 ${
                      dark ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    🛒
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${textSecondary}`}>
                    {item.name}
                  </p>
                  <p className={`text-xs mt-0.5 truncate ${textSecondary}`}>
                    Eliminado el{" "}
                    {new Date(item.deleted_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {item.creado_por ? ` · creado por ${item.creado_por}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestaurar(item)}
                  disabled={restaurandoId !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors shrink-0"
                >
                  {restaurandoId === item.id ? "Restaurando..." : "🔄 Restaurar"}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {customs.length === 0 ? (
        <div className={`text-center py-10 ${textSecondary}`}>
          <div className="text-4xl mb-3">⭐</div>
          <p>Este negocio todavía no tiene productos custom</p>
        </div>
      ) : (
        <div className={`divide-y ${borderColor}`}>
          {groups.map((g) => {
            const collapsed = isCollapsed(g.name);
            return (
              <div key={g.name}>
                <button
                  type="button"
                  onClick={() => toggleCat(g.name)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 transition-colors ${
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
                  <div className={`divide-y ${dark ? "divide-gray-700/60" : "divide-gray-100"}`}>
                    {g.items.map((c) => {
                      const asignados = assignments[c.id] || [];
                      const galeria = gallery[c.id] || [];
                      const creador = userNames[c.user_id];
                      const metaLinea = `${creador ? `👤 ${creador} · ` : ""}${
                        asignados.length > 0
                          ? `Asignado a: ${asignados.join(", ")}`
                          : "Sin asignar"
                      }`;

                      return (
                        <div key={c.id}>
                          <div className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${rowHover}`}>
                            {galeria.length > 0 && !listBroken.has(c.id) ? (
                              <button
                                type="button"
                                onClick={() => openLightbox(c.id, 0)}
                                title={`${galeria.length} imagen${galeria.length > 1 ? "es" : ""} · ver`}
                                className="relative shrink-0 cursor-pointer"
                              >
                                <img
                                  src={publicUrl(galeria[0])}
                                  alt=""
                                  onError={() =>
                                    setListBroken((prev) => new Set(prev).add(c.id))
                                  }
                                  className={`w-11 h-11 rounded-lg object-cover border ${
                                    dark ? "border-gray-600" : "border-gray-300"
                                  }`}
                                />
                                {galeria.length > 1 && (
                                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-600 text-white border border-white/70">
                                    +{galeria.length - 1}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div
                                className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                                  dark
                                    ? "bg-gray-700 text-gray-400"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                <span className="text-lg">🛒</span>
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate ${textPrimary}`}>
                                {c.name}
                              </p>
                              {(brandName(c) || c.talles?.length > 0) && (
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {brandName(c) && (
                                    <span
                                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                                        dark
                                          ? "bg-blue-500/15 text-blue-400"
                                          : "bg-blue-50 text-blue-600"
                                      }`}
                                    >
                                      {brandName(c)}
                                    </span>
                                  )}
                                  {c.talles?.length > 0 && (
                                    <span
                                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                                        dark
                                          ? "bg-teal-500/15 text-teal-400"
                                          : "bg-teal-50 text-teal-600"
                                      }`}
                                    >
                                      📏{" "}
                                      {c.talles
                                        .map((id) => sizes.find((s) => s.id === id)?.name)
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </span>
                                  )}
                                </div>
                              )}
                              <p
                                className={`text-[11px] mt-0.5 truncate ${textSecondary}`}
                                title={metaLinea}
                              >
                                {metaLinea}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => startEdit(c)}
                                title="Editar producto"
                                className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
                                  dark
                                    ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                }`}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setDeletingCustom(c)}
                                title="Enviar a la papelera"
                                className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
                                  dark
                                    ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                    : "bg-red-50 text-red-600 hover:bg-red-100"
                                }`}
                              >
                                🗑️
                              </button>
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
                                  setFormTalles([]);
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

                              {formCategoryId && (
                                <div>
                                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
                                    📏 Talles del producto
                                  </label>
                                  <p className={`text-[10px] mb-2 ${textSecondary}`}>
                                    Elegí los talles que ofrece este producto. Dejá vacío
                                    si se vende sin talles.
                                  </p>
                                  <SizeSelector
                                    sizes={getSizesByCategory(formCategoryId)}
                                    selected={formTalles}
                                    onChange={setFormTalles}
                                    dark={dark}
                                  />
                                </div>
                              )}

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

      {deletingCustom && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !eliminando && setDeletingCustom(null)}
        >
          <div
            className={`rounded-2xl shadow-2xl p-5 w-[90%] max-w-sm border ${bgCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🗑️</div>
              <p className={`font-semibold ${dark ? "text-red-400" : "text-red-600"}`}>
                ¿Eliminar "{deletingCustom.name}"?
              </p>
              <div className={`text-sm text-left rounded-lg px-3 py-2 mt-3 space-y-1.5 ${
                dark ? "bg-gray-700/50 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}>
                <p>
                  {(assignments[deletingCustom.id] || []).length > 0 ? (
                    <>
                      Se quitará del catálogo de:{" "}
                      <strong>{assignments[deletingCustom.id].join(", ")}</strong>
                    </>
                  ) : (
                    <>No está asignado a ningún catálogo.</>
                  )}
                </p>
                <p>Las ventas ya hechas conservan su nombre y montos.</p>
                <p>Puede restaurarse desde la papelera.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                onClick={handleEliminarConfirm}
                disabled={eliminando}
              >
                {eliminando ? "Eliminando..." : "✅ Eliminar"}
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                  dark
                    ? "bg-gray-600 hover:bg-gray-500 text-white"
                    : "bg-gray-300 hover:bg-gray-400 text-gray-800"
                }`}
                onClick={() => setDeletingCustom(null)}
                disabled={eliminando}
              >
                Cancelar
              </button>
            </div>
          </div>
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
