import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useAppContext } from "../../../contexto/Context";
import { useAdminData } from "../../../hooks/useAdminData";
import { useSizes } from "../hooksAdmin/useSizes";
import { ProductImagesEditor } from "../../usuario/components/ProductImagesEditor";
import { StockPorTalle, stockTallesToPayload, sumStockTalles } from "./productsBase/components/StockPorTalle";
import { repartirStockEntreTalles } from "../../../utils/talles";

const matchCustomFilters = (c, brand, categoria, subcategoria, creador) => {
  if (!brand && !categoria && !subcategoria && !creador) return true;
  const marca = c.brands?.name || c.brand_text || null;
  if (brand && marca !== brand) return false;
  if (categoria && c.categories?.name !== categoria) return false;
  if (subcategoria && c.subcategories?.name !== subcategoria) return false;
  if (creador && c.creador !== creador) return false;
  return true;
};

export function AssignCustomProducts({ selectedUser, dark, onCountChange }) {
  const { syncProductFromAdmin, profile, refetch } = useAppContext();
  const { users: cachedUsers } = useAdminData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customs, setCustoms] = useState([]);
  const [assignedData, setAssignedData] = useState([]);
  const [selected, setSelected] = useState({});
  const [activeTab, setActiveTab] = useState("asignar");
  const [notification, setNotification] = useState(null);
  const [editData, setEditData] = useState({});
  const [defaultPrices, setDefaultPrices] = useState({});
  const [assignedEstado, setAssignedEstado] = useState("activos");
  const [assignedChips, setAssignedChips] = useState({
    destacado: false,
    conStock: false,
    ocultos: false,
  });
  const [assignedSearch, setAssignedSearch] = useState("");
  const [filtroBrand, setFiltroBrand] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroSubcategoria, setFiltroSubcategoria] = useState("");
  const [filtroCreador, setFiltroCreador] = useState("");
  const [sortMode, setSortMode] = useState("nuevo");
  const [leavingIds, setLeavingIds] = useState(() => new Set());
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [selectedAssigned, setSelectedAssigned] = useState(() => new Set());
  const [showBulkAsignar, setShowBulkAsignar] = useState(false);
  const [showBulkAsignados, setShowBulkAsignados] = useState(false);
  const [bulkVenta, setBulkVenta] = useState("");
  const [bulkCompra, setBulkCompra] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkVentaAsig, setBulkVentaAsig] = useState("");
  const [bulkCompraAsig, setBulkCompraAsig] = useState("");
  const [bulkStockAsig, setBulkStockAsig] = useState("");
  const { getProductSizes } = useSizes();

  const baseCard = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white" : "bg-gray-50";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const borderColor = dark ? "border-gray-600" : "border-gray-200";

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const brandName = (c) => c.brands?.name || c.brand_text || null;

  const assignedCustomIds = useMemo(
    () => new Set(assignedData.map((a) => a.custom_id)),
    [assignedData]
  );

  const disponibles = useMemo(
    () => {
      let result = customs.filter(
        (c) =>
          !assignedCustomIds.has(c.id) &&
          matchCustomFilters(
            c,
            filtroBrand,
            filtroCategoria,
            filtroSubcategoria,
            filtroCreador
          )
      );

      if (sortMode === "alfabetico") {
        result = [...result].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })
        );
      } else {
        result = [...result].sort((a, b) => b.id - a.id);
      }

      return result;
    },
    [customs, assignedCustomIds, filtroBrand, filtroCategoria, filtroSubcategoria, filtroCreador, sortMode]
  );

  const activos = useMemo(
    () => assignedData.filter((a) => a.active !== false),
    [assignedData]
  );

  const inactivos = useMemo(
    () => assignedData.filter((a) => a.active === false),
    [assignedData]
  );

  const filterOptions = useMemo(() => {
    const brands = new Map();
    const cats = new Map();
    const subs = new Map();
    const creadores = new Map();

    customs.forEach((c) => {
      const marca = brandName(c) || "Sin marca";
      brands.set(marca, (brands.get(marca) || 0) + 1);

      const cat = c.categories?.name || "Sin categoría";
      cats.set(cat, (cats.get(cat) || 0) + 1);

      const sub = c.subcategories?.name || "Sin subcategoría";
      subs.set(sub, (subs.get(sub) || 0) + 1);

      const creador = c.creador || "Sin creador";
      creadores.set(creador, (creadores.get(creador) || 0) + 1);
    });

    const toList = (map) => Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

    return {
      brands: toList(brands),
      cats: toList(cats),
      subs: toList(subs),
      creadores: toList(creadores),
    };
  }, [customs]);

  const subcatOptions = useMemo(() => {
    if (!filtroCategoria) return filterOptions.subs;
    const pool = customs.filter((c) => c.categories?.name === filtroCategoria);
    const subs = new Map();
    pool.forEach((c) => {
      const sub = c.subcategories?.name || "Sin subcategoría";
      subs.set(sub, (subs.get(sub) || 0) + 1);
    });
    return Array.from(subs.entries()).sort((a, b) => b[1] - a[1]);
  }, [customs, filterOptions, filtroCategoria]);

  const hasCustomFilters = Boolean(
    filtroBrand || filtroCategoria || filtroSubcategoria || filtroCreador
  );

  const limpiarFiltros = () => {
    setFiltroBrand("");
    setFiltroCategoria("");
    setFiltroSubcategoria("");
    setFiltroCreador("");
  };

  const productosLista = useMemo(() => {
    let result = assignedEstado === "inactivos" ? inactivos : activos;

    if (assignedEstado === "activos") {
      if (assignedChips.destacado)
        result = result.filter((a) => a.destacado);
      if (assignedChips.conStock)
        result = result.filter((a) => {
          if (a.stock_talles && Object.keys(a.stock_talles).length > 0)
            return sumStockTalles(a.stock_talles) > 0;
          return Number(a.stock) > 0;
        });
      if (assignedChips.ocultos)
        result = result.filter((a) => a.visible === false);
    }

    if (assignedSearch) {
      const lower = assignedSearch.toLowerCase();
      result = result.filter((a) => {
        const c = customs.find((x) => x.id === a.custom_id);
        const marca = brandName(c);
        return (
          (c?.name && c.name.toLowerCase().includes(lower)) ||
          (marca && marca.toLowerCase().includes(lower))
        );
      });
    }

    if (filtroBrand || filtroCategoria || filtroSubcategoria || filtroCreador) {
      result = result.filter((a) => {
        const c = customs.find((x) => x.id === a.custom_id);
        return c && matchCustomFilters(c, filtroBrand, filtroCategoria, filtroSubcategoria, filtroCreador);
      });
    }

    if (sortMode === "alfabetico") {
      result = [...result].sort((x, y) => {
        const nx = customs.find((c) => c.id === x.custom_id)?.name || "";
        const ny = customs.find((c) => c.id === y.custom_id)?.name || "";
        return nx.localeCompare(ny, "es", { sensitivity: "base" });
      });
    }

    return result;
  }, [
    activos,
    inactivos,
    assignedEstado,
    assignedChips,
    assignedSearch,
    filtroBrand,
    filtroCategoria,
    filtroSubcategoria,
    filtroCreador,
    sortMode,
    customs,
  ]);

  const allExpanded = useMemo(
    () =>
      productosLista.length > 0 &&
      productosLista.every((a) => expandedItems.has(a.id)),
    [productosLista, expandedItems]
  );

  const toggleAssignedChip = (key) => {
    setAssignedChips((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpand = (upId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(upId)) next.delete(upId);
      else next.add(upId);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedItems(new Set());
    } else {
      setExpandedItems(new Set(productosLista.map((a) => a.id).filter(Boolean)));
    }
  };

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

      const tenantUserIds = cachedUsers.map((u) => u.id);
      const userNames = {};
      cachedUsers.forEach((u) => { userNames[u.id] = u.name; });

      // Batch 1: queries sin dependencias entre sí — corren en paralelo
      const [assignedRes, countRes] = await Promise.all([
        supabase
          .from("user_products")
          .select("id, custom_id, precio_venta, precio_compra, stock, stock_talles, descripcion, active, destacado, visible, imagenes")
          .eq("user_id", selectedUser.id)
          .not("custom_id", "is", null)
          .order("id", { ascending: false }),
        supabase
          .from("user_products")
          .select("id", { count: "exact" })
          .eq("user_id", selectedUser.id),
      ]);

      // Batch 2: customs + precios default — corren en paralelo
      const [customsRes, tenantUpRes] = await Promise.all([
        supabase
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
          .in("user_id", tenantUserIds),
        supabase
          .from("user_products")
          .select("custom_id, user_id, precio_compra, precio_venta, stock")
          .in("user_id", tenantUserIds)
          .not("custom_id", "is", null),
      ]);

      const customsList = customsRes.data || [];

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
  }, [selectedUser, showNotification, onCountChange, cachedUsers]);

  const reloadAssigned = useCallback(async () => {
    if (!selectedUser?.id) return;

    try {
      const [assignedRes, countRes] = await Promise.all([
        supabase
          .from("user_products")
          .select("id, custom_id, precio_venta, precio_compra, stock, stock_talles, descripcion, active, destacado, visible, imagenes")
          .eq("user_id", selectedUser.id)
          .not("custom_id", "is", null)
          .order("id", { ascending: false }),
        supabase
          .from("user_products")
          .select("id", { count: "exact" })
          .eq("user_id", selectedUser.id),
      ]);

      setAssignedData(assignedRes.data || []);
      onCountChange?.(selectedUser.id, countRes.count || 0);
    } catch (err) {
      console.error("Error recargando asignados:", err);
    }
  }, [selectedUser, onCountChange]);

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
          stock_talles: {},
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

  const updateStockTallesSel = (customId, value) => {
    setSelected((prev) => ({
      ...prev,
      [customId]: { ...prev[customId], stock_talles: value },
    }));
  };

  const defaultSelection = (c) => {
    const def = defaultPrices[c.id];
    return {
      precio_compra: def?.precio_compra ?? "",
      precio_venta: def?.precio_venta ?? "",
      stock: def?.stock ?? "",
      stock_talles: {},
    };
  };

  const selectAllCustom = () => {
    const next = {};
    disponibles.forEach((c) => {
      next[c.id] = defaultSelection(c);
    });
    setSelected(next);
    showNotification(
      `${disponibles.length} producto(s) seleccionado(s)`
    );
  };

  const selectFirstCustom = (n = 10) => {
    const next = {};
    disponibles.slice(0, n).forEach((c) => {
      next[c.id] = defaultSelection(c);
    });
    setSelected(next);
    showNotification(
      `${Math.min(n, disponibles.length)} producto(s) seleccionado(s)`
    );
  };

  const clearSelection = () => {
    setSelected({});
    setShowBulkAsignar(false);
    showNotification("Selección limpiada");
  };

  const applyBulkValue = (field, value) => {
    if (value === "") return;
    const ids = Object.keys(selected);
    if (ids.length === 0) {
      showNotification("Primero seleccioná productos", "warning");
      return;
    }
    const val =
      field === "stock" ? parseInt(value, 10) || 0 : parseFloat(value) || 0;

    // El stock es POR TALLE: el bulk solo aplica a productos sin talles.
    // Los que tienen talles se editan individualmente con el editor por talle.
    const skippedIds = ids.filter((id) => {
      if (field !== "stock") return false;
      const c = customs.find((x) => x.id === Number(id));
      return getProductSizes(c).length > 0;
    });
    const aplicados = ids.length - skippedIds.length;

    setSelected((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        if (skippedIds.includes(id)) return;
        next[id] = { ...prev[id], [field]: val };
      });
      return next;
    });

    const labels = {
      precio_venta: "Precio venta",
      precio_compra: "Precio compra",
      stock: "Stock",
    };

    if (field === "stock" && aplicados === 0) {
      showNotification(
        "Stock no aplicado: los productos seleccionados tienen talles (se editan por talle)",
        "warning"
      );
    } else if (field === "stock" && skippedIds.length > 0) {
      showNotification(
        `${labels[field]} $${value} aplicado a ${aplicados} producto(s) (${skippedIds.length} con talles se editan por talle)`
      );
    } else {
      showNotification(
        `${labels[field]} $${value} aplicado a ${aplicados} producto(s)`
      );
    }
  };

  useEffect(() => {
    const next = {};
    assignedData.forEach((a) => {
      const c = customs.find((x) => x.id === a.custom_id);
      const talles = c ? getProductSizes(c) : [];
      const tieneTalles = talles.length > 0;

      // Si el producto tiene talles y stock general heredado SIN desglose,
      // repartirlo entre los talles para que el admin lo vea y ajuste.
      const stockTalles =
        a.stock_talles && Object.keys(a.stock_talles).length
          ? a.stock_talles
          : tieneTalles && (a.stock ?? 0) > 0
            ? repartirStockEntreTalles(a.stock, talles)
            : {};

      next[a.id] = {
        precio_venta: a.precio_venta ?? 0,
        precio_compra: a.precio_compra ?? 0,
        stock: a.stock ?? 0,
        stock_talles: stockTalles,
        descripcion: a.descripcion ?? "",
        imagenes: a.imagenes || [],
        destacado: a.destacado === true,
      };
    });
    setEditData((prev) => {
      // Mezcla: la base se refresca desde assignedData, pero las ediciones
      // sin guardar de cada producto se preservan (no se pierden al togglear
      // destacado/visible u otra acción que actualice assignedData).
      const merged = {};
      Object.keys(next).forEach((k) => {
        merged[k] = prev[k] !== undefined ? prev[k] : next[k];
      });
      return merged;
    });
  }, [assignedData]);

  const updateEditField = (upId, field, value) => {
    setEditData((prev) => ({
      ...prev,
      [upId]: { ...prev[upId], [field]: value },
    }));
    setDirtyIds((prev) => new Set(prev).add(upId));
  };

  async function handleToggleDestacado(a) {
    try {
      await supabase
        .from("user_products")
        .update({ destacado: !a.destacado })
        .eq("id", a.id);

      setAssignedData((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, destacado: !a.destacado } : x))
      );
      syncProductFromAdmin(a.id, { destacado: !a.destacado });
      showNotification(
        a.destacado
          ? "Producto quitado de destacados"
          : "Producto marcado como destacado",
        "success"
      );
    } catch (err) {
      console.error("Error al cambiar destacado:", err);
      showNotification("Error al cambiar destacado", "error");
    }
  }

  async function handleToggleVisible(a) {
    try {
      const nuevoVisible = a.visible === false;
      await supabase
        .from("user_products")
        .update({ visible: nuevoVisible })
        .eq("id", a.id);

      setAssignedData((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, visible: nuevoVisible } : x))
      );
      syncProductFromAdmin(a.id, { visible: nuevoVisible });
      showNotification(
        nuevoVisible
          ? "Producto visible en el catálogo"
          : "Producto oculto del catálogo",
        "success"
      );
    } catch (err) {
      console.error("Error al cambiar visibilidad:", err);
      showNotification("Error al cambiar visibilidad", "error");
    }
  }

  const buildEditPayload = (upId) => {
    const data = editData[upId];
    if (!data) return null;
    const a = assignedData.find((x) => x.id === upId);
    const c = customs.find((x) => x.id === a?.custom_id);
    const tieneTalles = getProductSizes(c).length > 0;

    const payload = {
      precio_venta: Number(data.precio_venta) || 0,
      precio_compra: Number(data.precio_compra) || 0,
      stock: Number(data.stock) || 0,
      descripcion: data.descripcion || null,
      imagenes: data.imagenes || [],
    };

    if (tieneTalles) {
      const st = stockTallesToPayload(data.stock_talles, { force: true });
      if (st && Object.keys(st).length) {
        payload.stock_talles = st;
        payload.stock = sumStockTalles(st);
      } else if (Number(data.stock) > 0) {
        const repartido = repartirStockEntreTalles(
          Number(data.stock),
          getProductSizes(c)
        );
        payload.stock_talles = repartido;
        payload.stock = sumStockTalles(repartido);
      } else {
        payload.stock_talles = null;
      }
    } else {
      payload.stock_talles = null;
    }

    return payload;
  };

  async function handleSaveEdit(upId) {
    const data = editData[upId];
    if (!data) return;

    setSaving(true);

    try {
      const payload = buildEditPayload(upId);

      const { error } = await supabase
        .from("user_products")
        .update(payload)
        .eq("id", upId);

      if (error) throw error;

      setAssignedData((prev) =>
        prev.map((ap) =>
          ap.id === upId ? { ...ap, ...payload } : ap
        )
      );

      syncProductFromAdmin(upId, payload);
      showNotification("Producto actualizado");
      setDirtyIds((prev) => {
        const n = new Set(prev);
        n.delete(upId);
        return n;
      });
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
      const rows = ids.map((customId) => {
        const c = customs.find((x) => x.id === Number(customId));
        const tieneTalles = getProductSizes(c).length > 0;
        const st = selected[customId]?.stock_talles;
        const row = {
          user_id: selectedUser.id,
          custom_id: customId,
          precio_compra: Number(selected[customId].precio_compra) || 0,
          precio_venta: Number(selected[customId].precio_venta) || 0,
          stock: Number(selected[customId].stock) || 0,
          active: true,
          destacado: false,
        };
        if (tieneTalles) {
          row.stock_talles = stockTallesToPayload(st, { force: true }) || {};
          row.stock = sumStockTalles(st);
        }
        return row;
      });

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

      await reloadAssigned();
      if (selectedUser.id === profile?.id) {
        try {
          await refetch?.();
        } catch (e) {
          console.error("Error refrescando el catálogo:", e);
        }
      }
      setSelected({});
    } catch (err) {
      console.error("Error asignando customs:", err);
      showNotification("Error al asignar", "error");
    } finally {
      setSaving(false);
    }
  }

  const toggleAssignedSelect = (upId) => {
    setSelectedAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(upId)) next.delete(upId);
      else next.add(upId);
      return next;
    });
  };

  const selectAllAssigned = () => {
    setSelectedAssigned(new Set(productosLista.map((a) => a.id).filter(Boolean)));
    showNotification(`${productosLista.length} producto(s) seleccionado(s)`);
  };

  const clearAssignedSelection = () => {
    setSelectedAssigned(new Set());
    showNotification("Selección limpiada");
  };

  const applyBulkAssigned = (field, value) => {
    if (value === "") return;
    if (selectedAssigned.size === 0) {
      showNotification("Primero seleccioná productos", "warning");
      return;
    }
    const val =
      field === "stock" ? parseInt(value, 10) || 0 : parseFloat(value) || 0;

    const upIds = [...selectedAssigned];
    // El stock es POR TALLE: el bulk solo aplica a productos sin talles.
    const skippedIds = upIds.filter((upId) => {
      if (field !== "stock") return false;
      const a = assignedData.find((x) => x.id === upId);
      const c = customs.find((x) => x.id === a?.custom_id);
      return c && getProductSizes(c).length > 0;
    });
    const aplicados = upIds.length - skippedIds.length;

    setEditData((prev) => {
      const next = { ...prev };
      upIds.forEach((upId) => {
        if (skippedIds.includes(upId)) return;
        const base = prev[upId];
        if (!base) return;
        next[upId] = { ...base, [field]: val };
      });
      return next;
    });

    const labels = {
      precio_venta: "Precio venta",
      precio_compra: "Precio compra",
      stock: "Stock",
    };

    if (field === "stock" && aplicados === 0) {
      showNotification(
        "Stock no aplicado: los productos seleccionados tienen talles (se editan por talle)",
        "warning"
      );
    } else if (field === "stock" && skippedIds.length > 0) {
      showNotification(
        `${labels[field]} $${value} aplicado a ${aplicados} producto(s) (${skippedIds.length} con talles se editan por talle)`
      );
    } else {
      showNotification(
        `${labels[field]} $${value} aplicado a ${aplicados} producto(s)`
      );
    }
  };

  async function handleSaveBulkEdit() {
    if (selectedAssigned.size === 0) return;

    const payloads = [...selectedAssigned]
      .map((upId) => ({ upId, payload: buildEditPayload(upId) }))
      .filter((x) => x.payload);

    if (payloads.length === 0) {
      showNotification("No hay datos para guardar", "warning");
      return;
    }

    setSaving(true);

    try {
      const rows = payloads.map(({ upId, payload }) => ({
        id: upId,
        ...payload,
      }));

      const { data, error } = await supabase.rpc(
        "bulk_update_user_products",
        { payloads: rows }
      );

      if (error) throw error;

      const aplicadosIds = new Set(data?.ids || []);
      const noAplicados = data?.no_aplicados ?? 0;
      const aplicados = payloads.filter(({ upId }) => aplicadosIds.has(upId));

      const map = {};
      aplicados.forEach((p) => { map[p.upId] = p.payload; });
      setAssignedData((prev) =>
        prev.map((ap) => (map[ap.id] ? { ...ap, ...map[ap.id] } : ap))
      );

      aplicados.forEach(({ upId, payload }) =>
        syncProductFromAdmin(upId, payload)
      );

      // Los que no se pudieron aplicar quedan seleccionados y sucios
      // para reintentarlos.
      setSelectedAssigned(
        new Set(
          payloads
            .filter(({ upId }) => !aplicadosIds.has(upId))
            .map(({ upId }) => upId)
        )
      );
      setDirtyIds((prev) => {
        const n = new Set(prev);
        aplicadosIds.forEach((id) => n.delete(id));
        return n;
      });

      showNotification(
        noAplicados > 0
          ? `${aplicados.length} actualizado(s), ${noAplicados} no aplicado(s)`
          : `${aplicados.length} producto(s) actualizado(s)`
      );
    } catch (err) {
      console.error("Error actualizando productos:", err);
      showNotification("Error al actualizar los productos", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(prod, active) {
    const upId = prod.id;
    try {
      const tieneStockTalles =
        prod.stock_talles && Object.keys(prod.stock_talles).length > 0;

      // El stock general es dato derivado de los stocks por talle:
      // - al desactivar, no vaciar el stock si el producto tiene talles
      // - al reactivar, recalcular el stock general desde los talles
      let update;
      if (active) {
        update = { active: true };
        if (tieneStockTalles) {
          update.stock = sumStockTalles(prod.stock_talles);
        }
      } else {
        update = { active: false };
        if (!tieneStockTalles) update.stock = 0;
      }

      const { error } = await supabase
        .from("user_products")
        .update(update)
        .eq("id", upId);

      if (error) throw error;

      // Animación de salida: desvanecer el item en pantalla ANTES de
      // recargar la lista, para que se vea que salió y no desaparezca seco.
      setLeavingIds((prev) => new Set(prev).add(upId));
      showNotification(active ? "Producto reactivado" : "Producto desactivado");
      await new Promise((resolve) => setTimeout(resolve, 350));
      await reloadAssigned();
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(upId);
        return next;
      });

      if (selectedUser.id === profile?.id) {
        try {
          await refetch?.();
        } catch (e) {
          console.error("Error refrescando el catálogo:", e);
        }
      }
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

          <FilterPanel
            dark={dark}
            inputBg={inputBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            customs={customs}
            filterOptions={filterOptions}
            subcatOptions={subcatOptions}
            filtroBrand={filtroBrand}
            setFiltroBrand={setFiltroBrand}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
            filtroSubcategoria={filtroSubcategoria}
            setFiltroSubcategoria={setFiltroSubcategoria}
            filtroCreador={filtroCreador}
            setFiltroCreador={setFiltroCreador}
            hasCustomFilters={hasCustomFilters}
            limpiarFiltros={limpiarFiltros}
            sortMode={sortMode}
            setSortMode={setSortMode}
          />

          <div className={`mt-3 rounded-xl border overflow-hidden ${baseCard}`}>
            <button
              type="button"
              onClick={() => setShowBulkAsignar((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors hover:bg-blue-500/10"
            >
              <span className={textPrimary}>
                ⚙️ Valores generales para seleccionados
                {Object.keys(selected).length > 0 && (
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500`}>
                    {Object.keys(selected).length}
                  </span>
                )}
              </span>
              <span className={`text-xs ${textSecondary}`}>
                {showBulkAsignar ? "−" : "＋"}
              </span>
            </button>

            {showBulkAsignar && (
              <div className="px-3 pb-3 pt-2 border-t border-gray-600/20 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>
                      Precio venta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkVenta}
                      onChange={(e) => setBulkVenta(e.target.value)}
                      placeholder="0"
                      className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>
                      Precio compra
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkCompra}
                      onChange={(e) => setBulkCompra(e.target.value)}
                      placeholder="0"
                      className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>
                      Stock
                    </label>
                    <input
                      type="number"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                      placeholder="0"
                      className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                    />
                  </div>
                </div>

                {Number(bulkCompra) > 0 &&
                  Number(bulkVenta) > 0 &&
                  Number(bulkCompra) > Number(bulkVenta) && (
                    <div className="px-2 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-medium">
                      ⚠️ Compra ($ {Number(bulkCompra)}) &gt; venta ($ {Number(bulkVenta)})
                    </div>
                  )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (bulkVenta !== "") applyBulkValue("precio_venta", bulkVenta);
                      if (bulkCompra !== "") applyBulkValue("precio_compra", bulkCompra);
                      if (bulkStock !== "") applyBulkValue("stock", bulkStock);
                    }}
                    disabled={Object.keys(selected).length === 0}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors disabled:opacity-40"
                  >
                    ⚡ Aplicar
                  </button>
                  <button
                    onClick={selectAllCustom}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${borderColor} ${textSecondary} hover:bg-blue-500/10 transition-colors`}
                  >
                    ✅ Todos ({disponibles.length})
                  </button>
                  <button
                    onClick={clearSelection}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${borderColor} ${textSecondary} hover:bg-red-500/10 transition-colors`}
                  >
                    ✕ Limpiar
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 25].map((n) => (
                    <button
                      key={n}
                      onClick={() => selectFirstCustom(n)}
                      className={`px-3 py-1 rounded-full text-xs ${dark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} ${textSecondary}`}
                    >
                      Primeros {n}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const cleared = {};
                      Object.keys(selected).forEach((id) => {
                        cleared[id] = { precio_venta: 0, precio_compra: 0, stock: 0, stock_talles: {} };
                      });
                      setSelected(cleared);
                    }}
                    className={`px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors`}
                  >
                    Limpiar Valores
                  </button>
                </div>

                <p className={`text-[10px] ${textSecondary}`}>
                  Los valores se aplican a los seleccionados y se pueden ajustar
                  en cada producto antes de asignar. El stock es por talle: en
                  productos con talles se edita individualmente.
                </p>
              </div>
            )}
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
                const prodSizes = getProductSizes(c);
                const tieneWarning =
                  selected[c.id]?.precio_venta > 0 &&
                  selected[c.id]?.precio_compra > 0 &&
                  selected[c.id].precio_venta < selected[c.id].precio_compra;
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? `border-blue-500 bg-blue-500/10 ${tieneWarning ? "ring-2 ring-red-500" : ""}`
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
                        {prodSizes.length === 0 && (
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
                        )}
                        {tieneWarning && (
                          <span className="text-red-500 font-bold text-xs">⚠️ P. venta &lt; compra</span>
                        )}
                      </div>
                    )}

                    {isSelected && prodSizes.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <StockPorTalle
                          sizes={prodSizes}
                          value={selected[c.id]?.stock_talles || {}}
                          onChange={(v) => updateStockTallesSel(c.id, v)}
                          dark={dark}
                        />
                        <p className={`text-[10px] mt-1 ${textSecondary}`}>
                          El stock general se calcula como la suma de los talles.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {Object.keys(selected).length > 0 && (
            <div className={`fixed bottom-0 left-0 right-0 p-4 ${dark ? "bg-gray-900 border-t border-gray-800" : "bg-white border-t border-gray-200"} shadow-2xl z-40`}>
              <div className="max-w-6xl mx-auto">
                {(() => {
                  let negativoCount = 0;
                  Object.values(selected).forEach((p) => {
                    if (p.precio_venta > 0 && p.precio_compra > 0 && p.precio_venta < p.precio_compra) {
                      negativoCount++;
                    }
                  });
                  return negativoCount > 0 ? (
                    <div className="mb-3 p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                      ⚠️ {negativoCount} producto(s) con precio de venta menor al de compra
                    </div>
                  ) : null;
                })()}
              <div className="flex items-center justify-between gap-4">
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
            <>
              <div className={`rounded-xl p-3 mb-3 ${baseCard} border`}>
                <div className={`flex gap-1 p-1 rounded-xl ${dark ? "bg-gray-700/50" : "bg-gray-200/70"}`}>
                  <button
                    onClick={() => setAssignedEstado("activos")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      assignedEstado === "activos"
                        ? "bg-green-500 text-white shadow"
                        : `${textSecondary}`
                    }`}
                  >
                    ✓ Activos ({activos.length})
                  </button>
                  <button
                    onClick={() => setAssignedEstado("inactivos")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      assignedEstado === "inactivos"
                        ? "bg-red-500 text-white shadow"
                        : `${textSecondary}`
                    }`}
                  >
                    ✗ Inactivos ({inactivos.length})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="🔍 Buscar producto..."
                  value={assignedSearch}
                  onChange={(e) => setAssignedSearch(e.target.value)}
                  className={`w-full mt-3 p-2 rounded-lg border text-sm ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                />

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[
                    { key: "destacado", label: "★ Destacados" },
                    { key: "conStock", label: "📦 Con stock" },
                    { key: "ocultos", label: "👁 Ocultos" },
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      onClick={() => toggleAssignedChip(chip.key)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                        assignedChips[chip.key]
                          ? dark
                            ? "bg-blue-500/30 border-blue-400 text-blue-300"
                            : "bg-blue-500/15 border-blue-400 text-blue-600"
                          : `${dark ? "border-gray-600 text-gray-400" : "border-gray-200 text-gray-500"}`
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button
                    onClick={toggleExpandAll}
                    disabled={productosLista.length === 0}
                    className={`text-[11px] px-2 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                      dark ? "border-gray-600 text-gray-400" : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {allExpanded ? "− Colapsar todo" : "＋ Expandir todo"}
                  </button>
                </div>

                <div className="mt-3 border-t pt-3" style={{ borderColor: dark ? "#374151" : "#e5e7eb" }}>
                  <FilterPanel
                    dark={dark}
                    inputBg={inputBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    customs={customs}
                    filterOptions={filterOptions}
                    subcatOptions={subcatOptions}
                    filtroBrand={filtroBrand}
                    setFiltroBrand={setFiltroBrand}
                    filtroCategoria={filtroCategoria}
                    setFiltroCategoria={setFiltroCategoria}
                    filtroSubcategoria={filtroSubcategoria}
                    setFiltroSubcategoria={setFiltroSubcategoria}
                    filtroCreador={filtroCreador}
                    setFiltroCreador={setFiltroCreador}
                    hasCustomFilters={hasCustomFilters}
                    limpiarFiltros={limpiarFiltros}
                    sortMode={sortMode}
                    setSortMode={setSortMode}
                  />

                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={selectAllAssigned}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${borderColor} ${textSecondary} hover:bg-blue-500/10 transition-colors`}
                    >
                      ✅ Todos ({productosLista.length})
                    </button>
                    <button
                      onClick={clearAssignedSelection}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${borderColor} ${textSecondary} hover:bg-red-500/10 transition-colors`}
                    >
                      ✕ Limpiar
                    </button>
                    {selectedAssigned.size > 0 && (
                      <span className={`px-2 py-1 rounded-full text-[10px] bg-blue-500/20 ${textPrimary}`}>
                        {selectedAssigned.size} seleccionado(s)
                      </span>
                    )}
                  </div>

                  <div className={`mt-3 rounded-xl border overflow-hidden ${baseCard}`}>
                    <button
                      type="button"
                      onClick={() => setShowBulkAsignados((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors hover:bg-blue-500/10"
                    >
                      <span className={textPrimary}>
                        ⚙️ Edición masiva
                        {selectedAssigned.size > 0 && (
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500`}>
                            {selectedAssigned.size}
                          </span>
                        )}
                      </span>
                      <span className={`text-xs ${textSecondary}`}>
                        {showBulkAsignados ? "−" : "＋"}
                      </span>
                    </button>

                    {showBulkAsignados && (
                      <div className="px-3 pb-3 pt-2 border-t border-gray-600/20 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>
                              Precio venta
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={bulkVentaAsig}
                              onChange={(e) => setBulkVentaAsig(e.target.value)}
                              placeholder="0"
                              className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>
                              Precio compra
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={bulkCompraAsig}
                              onChange={(e) => setBulkCompraAsig(e.target.value)}
                              placeholder="0"
                              className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>
                              Stock
                            </label>
                            <input
                              type="number"
                              value={bulkStockAsig}
                              onChange={(e) => setBulkStockAsig(e.target.value)}
                              placeholder="0"
                              className={`w-full p-1.5 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                            />
                          </div>
                        </div>

                        {Number(bulkCompraAsig) > 0 &&
                          Number(bulkVentaAsig) > 0 &&
                          Number(bulkCompraAsig) > Number(bulkVentaAsig) && (
                            <div className="px-2 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-medium">
                              ⚠️ Compra ($ {Number(bulkCompraAsig)}) &gt; venta ($ {Number(bulkVentaAsig)})
                            </div>
                          )}

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (bulkVentaAsig !== "") applyBulkAssigned("precio_venta", bulkVentaAsig);
                              if (bulkCompraAsig !== "") applyBulkAssigned("precio_compra", bulkCompraAsig);
                              if (bulkStockAsig !== "") applyBulkAssigned("stock", bulkStockAsig);
                            }}
                            disabled={selectedAssigned.size === 0}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors disabled:opacity-40"
                          >
                            ⚡ Aplicar
                          </button>
                          <button
                            onClick={handleSaveBulkEdit}
                            disabled={saving || selectedAssigned.size === 0}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-500 transition-colors disabled:opacity-40"
                          >
                            {saving ? "Guardando..." : `💾 Guardar ${selectedAssigned.size}`}
                          </button>
                        </div>

                        <p className={`text-[10px] ${textSecondary}`}>
                          Los valores se aplican a los productos seleccionados y se
                          guardan al tocar "Guardar". El stock es por talle: en
                          productos con talles se edita individualmente.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {productosLista.length === 0 ? (
                <div className={`text-center py-10 ${textSecondary}`}>
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-sm">Ningún producto coincide con los filtros</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {productosLista.map((a) => {
                const c = customs.find((x) => x.id === a.custom_id);
                const upId = a.id;
                const isExpanded = expandedItems.has(upId);
                const isLeaving = leavingIds.has(upId);
                const ed = editData[upId];
                const img = publicUrl(
                  ed?.imagenes?.[0] || a.imagenes?.[0] || c?.image_url
                );
                const compra = Number(ed?.precio_compra) || 0;
                const venta = Number(ed?.precio_venta) || 0;
                const compraMayorVenta = compra > 0 && venta > 0 && compra > venta;
                const prodSizes = getProductSizes(c);
                const stockTotal =
                  prodSizes.length > 0
                    ? sumStockTalles(ed?.stock_talles || a.stock_talles || {})
                    : Number(ed?.stock ?? a.stock) || 0;
                const stockOk = stockTotal > 0;
                const precioShow = Number(ed?.precio_venta ?? a.precio_venta) || 0;

                return assignedEstado === "inactivos" ? (
                  <div
                    key={upId}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border transition-all duration-300 ease-in-out ${
                      isLeaving ? "opacity-0 scale-95 translate-x-4 pointer-events-none" : ""
                    } ${dark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={c?.name || "Producto"}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                        className="w-9 h-9 rounded-lg object-cover border flex-shrink-0 opacity-60"
                        style={{ borderColor: dark ? "#4b5563" : "#e5e7eb" }}
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-lg border flex-shrink-0 flex items-center justify-center text-base opacity-60 ${dark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"}`}>
                        🛒
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium line-through opacity-60 text-sm truncate ${textPrimary}`}>
                        {c?.name || "Producto desconocido"}
                      </p>
                      <p className={`text-[10px] opacity-60 truncate ${textSecondary}`}>
                        {brandName(c) || "Sin marca"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActive(a, true)}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors shrink-0"
                    >
                      ⟳ Reactivar
                    </button>
                  </div>
                ) : (
                  <div
                    key={upId}
                    className={`rounded-xl border overflow-hidden transition-all duration-300 ease-in-out ${
                      isLeaving ? "opacity-0 scale-95 translate-x-4" : ""
                    } ${
                      selectedAssigned.has(upId)
                        ? "border-blue-500 ring-2 ring-blue-500/50"
                        : ""
                    } ${baseCard}`}
                  >
                    {/* Fila compacta */}
                    <div
                      onClick={() => toggleExpand(upId)}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssigned.has(upId)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleAssignedSelect(upId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-blue-500 flex-shrink-0"
                      />

                      {img ? (
                        <img
                          src={img}
                          alt={c?.name || "Producto"}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          className="w-9 h-9 rounded-lg object-cover border flex-shrink-0"
                          style={{ borderColor: dark ? "#4b5563" : "#e5e7eb" }}
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-lg border flex-shrink-0 flex items-center justify-center text-base ${dark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"}`}>
                          🛒
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${textPrimary}`}>
                          {c?.name || "Producto desconocido"}
                          {a.destacado && <span className="text-yellow-400 ml-1">★</span>}
                          {a.visible === false && <span className="text-gray-500 ml-1">👁‍🗨</span>}
                          {dirtyIds.has(upId) && (
                            <span className="text-amber-400 ml-1" title="Cambios sin guardar">●</span>
                          )}
                        </p>
                        <p className={`text-[10px] truncate ${textSecondary}`}>
                          {brandName(c) || "Sin marca"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${textPrimary}`}>
                            ${precioShow.toLocaleString()}
                          </p>
                          <p
                            className={`text-[10px] font-medium ${
                              stockOk
                                ? dark ? "text-green-400" : "text-green-600"
                                : textSecondary
                            }`}
                          >
                            {stockTotal} {prodSizes.length > 0 ? "uds talle" : "uds"}
                          </p>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(upId);
                          }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                            isExpanded
                              ? "rotate-180 border-amber-400 text-amber-400"
                              : dark ? "border-gray-600" : "border-gray-300"
                          } ${dark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          <span className="text-sm leading-none">▼</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden min-h-0">
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 pb-2.5 pt-2 border-t border-gray-600/20"
                        >
                          {/* toolbar compacta: acciones + guardar */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleDestacado(a)}
                                title={a.destacado ? "Quitar de destacados" : "Marcar como destacado"}
                                className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-colors ${
                                  a.destacado
                                    ? "bg-yellow-400/20 border-yellow-400 text-yellow-500"
                                    : `${borderColor} ${textSecondary} hover:bg-yellow-400/10`
                                }`}
                              >
                                ★
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleVisible(a)}
                                title={a.visible === false ? "Mostrar en el catálogo" : "Ocultar del catálogo"}
                                className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-colors ${borderColor} ${textSecondary} hover:bg-gray-500/10`}
                              >
                                {a.visible === false ? "👁‍🗨" : "👁"}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleActive(a, false)}
                                title="Desactivar producto"
                                className="w-7 h-7 rounded-lg border border-red-500/40 flex items-center justify-center text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                🚫
                              </button>
                            </div>

                            <button
                              onClick={() => handleSaveEdit(upId)}
                              disabled={saving || !dirtyIds.has(upId)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                                dirtyIds.has(upId)
                                  ? "bg-amber-500 text-white hover:bg-amber-600"
                                  : "bg-blue-600 text-white hover:bg-blue-500"
                              }`}
                            >
                              {saving
                                ? "Guardando..."
                                : dirtyIds.has(upId)
                                  ? "● Guardar"
                                  : "💾 Guardar"}
                            </button>
                          </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Compra</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ed?.precio_compra ?? ""}
                          onChange={(e) => updateEditField(a.id, "precio_compra", e.target.value)}
                          className={`w-full p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Venta</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ed?.precio_venta ?? ""}
                          onChange={(e) => updateEditField(a.id, "precio_venta", e.target.value)}
                          className={`w-full p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                      {prodSizes.length === 0 && (
                        <div className="col-span-2">
                          <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Stock</label>
                          <input
                            type="number"
                            value={ed?.stock ?? ""}
                            onChange={(e) => updateEditField(a.id, "stock", e.target.value)}
                            className={`w-full p-1 rounded border text-xs text-right ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>Descripción</label>
                        <input
                          type="text"
                          value={ed?.descripcion ?? ""}
                          onChange={(e) => updateEditField(a.id, "descripcion", e.target.value)}
                          placeholder="Descripción del producto"
                          className={`w-full p-1 rounded border text-xs ${inputBg} ${dark ? "border-gray-600" : "border-gray-200"}`}
                        />
                      </div>
                    </div>

                    {prodSizes.length > 0 && (
                      <div className="mt-2">
                        <StockPorTalle
                          sizes={prodSizes}
                          value={ed?.stock_talles || {}}
                          onChange={(v) => updateEditField(a.id, "stock_talles", v)}
                          dark={dark}
                        />
                        <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                          Total: {sumStockTalles(ed?.stock_talles)} uds (suma de talles)
                        </p>
                      </div>
                    )}

                    {compraMayorVenta && (
                      <div
                        className={`mt-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                          dark
                            ? "bg-red-500/20 text-red-400"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        ⚠️ Compra ($ {compra}) &gt; venta ($ {venta})
                      </div>
                    )}

                    <div className="mt-2">
                      <ProductImagesEditor
                        tenantId={selectedUser.tenant_id}
                        productId={a.id}
                        imagenes={ed?.imagenes || []}
                        onImagenesChange={(nuevas) =>
                          updateEditField(a.id, "imagenes", nuevas)
                        }
                        dark={dark}
                      />
                      <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                        Imagen propia de{" "}
                        <b className={textPrimary}>{selectedUser.name}</b>; si no
                        hay, se usa la general del producto.
                      </p>
                    </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function FilterPanel({
  dark,
  inputBg,
  borderColor,
  textSecondary,
  customs,
  filterOptions,
  subcatOptions,
  filtroBrand,
  setFiltroBrand,
  filtroCategoria,
  setFiltroCategoria,
  filtroSubcategoria,
  setFiltroSubcategoria,
  filtroCreador,
  setFiltroCreador,
  hasCustomFilters,
  limpiarFiltros,
  sortMode,
  setSortMode,
}) {
  const selectCls = `w-full p-1.5 rounded-lg border text-[11px] sm:text-xs ${inputBg} ${borderColor} focus:outline-none focus:ring-2 focus:ring-blue-500/40`;

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
      <select
        value={filtroBrand}
        onChange={(e) => setFiltroBrand(e.target.value)}
        className={`${selectCls} sm:w-auto sm:flex-1 sm:min-w-[9rem]`}
      >
        <option value="">🏷️ Todas las marcas</option>
        {filterOptions.brands.map(([name, count]) => (
          <option key={name} value={name}>
            {name} ({count})
          </option>
        ))}
      </select>

      <select
        value={filtroCategoria}
        onChange={(e) => {
          const nuevaCat = e.target.value;
          setFiltroCategoria(nuevaCat);
          if (filtroSubcategoria && nuevaCat) {
            const sigueEnCat = customs.some(
              (c) => c.categories?.name === nuevaCat && c.subcategories?.name === filtroSubcategoria
            );
            if (!sigueEnCat) setFiltroSubcategoria("");
          }
          if (!nuevaCat) setFiltroSubcategoria("");
        }}
        className={`${selectCls} sm:w-auto sm:flex-1 sm:min-w-[9rem]`}
      >
        <option value="">📁 Todas las categorías</option>
        {filterOptions.cats.map(([name, count]) => (
          <option key={name} value={name}>
            {name} ({count})
          </option>
        ))}
      </select>

      <select
        value={filtroSubcategoria}
        onChange={(e) => setFiltroSubcategoria(e.target.value)}
        className={`${selectCls} sm:w-auto sm:flex-1 sm:min-w-[9rem]`}
        disabled={!filtroCategoria}
      >
        <option value="">
          {filtroCategoria ? "📂 Todas las subcategorías" : "📂 Elegí categoría"}
        </option>
        {subcatOptions.map(([name, count]) => (
          <option key={name} value={name}>
            {name} ({count})
          </option>
        ))}
      </select>

      <select
        value={filtroCreador}
        onChange={(e) => setFiltroCreador(e.target.value)}
        className={`${selectCls} sm:w-auto sm:flex-1 sm:min-w-[9rem]`}
      >
        <option value="">👤 Todos los creadores</option>
        {filterOptions.creadores.map(([name, count]) => (
          <option key={name} value={name}>
            {name} ({count})
          </option>
        ))}
      </select>

      <div className="col-span-2 sm:col-auto sm:ml-auto flex items-center justify-between gap-1.5 flex-wrap">
        {hasCustomFilters && (
          <button
            onClick={limpiarFiltros}
            className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium border transition-colors ${
              dark
                ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                : "border-red-300 text-red-500 hover:bg-red-50"
            }`}
          >
            ✕ Limpiar
          </button>
        )}

        {sortMode && setSortMode && (
          <div
            className={`flex gap-0.5 p-0.5 rounded-lg ${dark ? "bg-gray-700/60" : "bg-gray-200/70"}`}
          >
            <button
              onClick={() => setSortMode("nuevo")}
              className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all ${
                sortMode === "nuevo"
                  ? "bg-blue-500 text-white shadow"
                  : dark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              🕒 Más nuevos
            </button>
            <button
              onClick={() => setSortMode("alfabetico")}
              className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all ${
                sortMode === "alfabetico"
                  ? "bg-blue-500 text-white shadow"
                  : dark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              🔤 Alfabético
            </button>
          </div>
        )}

        <span className={`text-[10px] sm:text-[11px] ${textSecondary} whitespace-nowrap`}>
          Filtros: {[filtroBrand, filtroCategoria, filtroSubcategoria, filtroCreador].filter(Boolean).length}/4
        </span>
      </div>
    </div>
  );
}
