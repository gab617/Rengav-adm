import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useAppContext } from "../../../contexto/Context";
import { useAdminData } from "../../../hooks/useAdminData";

function StarToggle({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={on ? "Quitar de destacados" : "Marcar como destacado"}
      className={`text-lg leading-none transition-colors ${
        on ? "text-yellow-400" : "text-gray-300 hover:text-yellow-400"
      }`}
    >
      ★
    </button>
  );
}

export function EditPorSucursales({ dark }) {
  const { profile } = useAppContext();
  const { invalidateUserProducts } = useAdminData();
  const esSuperAdmin = profile?.role === "super_admin";

  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [sucursalesSel, setSucursalesSel] = useState([]);
  const [productos, setProductos] = useState([]);
  const [grid, setGrid] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroSubcategoria, setFiltroSubcategoria] = useState("todos");
  const [filtroMarca, setFiltroMarca] = useState("todos");
  const [search, setSearch] = useState("");
  const [soloCompartidos, setSoloCompartidos] = useState(false);
  const [filaGlobal, setFilaGlobal] = useState({});
  const [agregando, setAgregando] = useState(false);
  const [vista, setVista] = useState("tabla");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [notification, setNotification] = useState(null);

  const tablaScrollRef = useRef(null);
  const dragRef = useRef({ activo: false, startX: 0, startScroll: 0, moved: false });

  const onDragStart = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("input, select, textarea, button")) return;
    const el = tablaScrollRef.current;
    if (!el) return;
    dragRef.current = {
      activo: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };

  const onDragMove = (e) => {
    const st = dragRef.current;
    const el = tablaScrollRef.current;
    if (!st.activo || !el) return;
    const dx = e.clientX - st.startX;
    if (!st.moved && Math.abs(dx) > 4) {
      st.moved = true;
      setArrastrando(true);
    }
    if (st.moved) el.scrollLeft = st.startScroll - dx;
  };

  const onDragEnd = () => {
    if (dragRef.current.activo) {
      dragRef.current.activo = false;
      setArrastrando(false);
    }
  };

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const publicUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage
      .from("product-images")
      .getPublicUrl(path).data.publicUrl;
  };

  const tenantId = esSuperAdmin ? selectedTenantId : profile?.tenant_id;

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const baseCard = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const inputBg = dark
    ? "bg-gray-700 text-white"
    : "bg-gray-50";
  const borderColor = dark ? "border-gray-600" : "border-gray-200";
  const placeholderCls = dark
    ? "placeholder:text-gray-400"
    : "placeholder:text-gray-500";
  const stickyBg = dark ? "bg-gray-800" : "bg-white";
  const borderRow = dark ? "border-gray-700" : "border-gray-200";

  useEffect(() => {
    if (!esSuperAdmin) return;
    supabase
      .from("tenants")
      .select("id, name")
      .order("id", { ascending: false })
      .then(({ data }) => {
        setTenants(data || []);
        setSelectedTenantId((prev) => prev || data?.[0]?.id || "");
      })
      .catch(() => {});
  }, [esSuperAdmin]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("tenant_id", tenantId);

      const userList = users || [];
      const userIds = userList.map((u) => u.id);

      const { data: ups } = await supabase
        .from("user_products")
        .select(
          "id, user_id, base_id, custom_id, precio_venta, precio_compra, stock, active, destacado"
        )
        .in("user_id", userIds);

      const upsList = ups || [];

      const baseIds = [
        ...new Set(upsList.filter((u) => u.base_id).map((u) => u.base_id)),
      ];
      const customIds = [
        ...new Set(upsList.filter((u) => u.custom_id).map((u) => u.custom_id)),
      ];

      const [baseRes, customRes] = await Promise.all([
        baseIds.length
          ? supabase
              .from("products_base")
              .select(
                "id, name, image_url, category_id, subcategory_id, brands ( name ), categories ( id, name ), subcategories ( id, name )"
              )
              .in("id", baseIds)
          : Promise.resolve({ data: [] }),
        customIds.length
          ? supabase
              .from("user_custom_products")
              .select(
                "id, name, image_url, brand_text, category_id, subcategory_id, categories ( id, name ), subcategories ( id, name )"
              )
              .in("id", customIds)
          : Promise.resolve({ data: [] }),
      ]);

      const baseMap = new Map((baseRes.data || []).map((b) => [b.id, b]));
      const customMap = new Map((customRes.data || []).map((c) => [c.id, c]));

      const info = {};
      const porSucursal = {};

      upsList.forEach((up) => {
        const esBase = !!up.base_id;
        const key = esBase ? `base:${up.base_id}` : `custom:${up.custom_id}`;
        const meta = esBase
          ? baseMap.get(up.base_id)
          : customMap.get(up.custom_id);
        if (!meta) return;

        if (!info[key]) {
          info[key] = {
            key,
            tipo: esBase ? "base" : "custom",
            id: esBase ? up.base_id : up.custom_id,
            name: meta.name,
            image_url: meta.image_url,
            brand: esBase
              ? meta.brands?.name || null
              : meta.brand_text || null,
            category: meta.categories?.name || null,
            subcategory: meta.subcategories?.name || null,
          };
        }

        if (!porSucursal[key]) porSucursal[key] = {};
        porSucursal[key][up.user_id] = {
          upId: up.id,
          precio_venta: up.precio_venta ?? 0,
          precio_compra: up.precio_compra ?? 0,
          stock: up.stock ?? 0,
          active: up.active !== false,
          destacado: up.destacado === true,
        };
      });

      setUsuarios(userList);
      setSucursalesSel(userIds);
      setProductos(Object.values(info).sort((a, b) => a.name.localeCompare(b.name)));
      setGrid(porSucursal);
      setOriginal(JSON.parse(JSON.stringify(porSucursal)));
      setFilaGlobal({});
      setProductoSeleccionado(null);
    } catch (err) {
      console.error("Error cargando sucursales:", err);
      showNotification("Error cargando las sucursales", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId, showNotification]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSucursal = (userId) => {
    setSucursalesSel((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleTodasLasSucursales = () => {
    setSucursalesSel((prev) =>
      prev.length === usuarios.length ? [] : usuarios.map((u) => u.id)
    );
  };

  const updateCell = (key, userId, field, value) => {
    setGrid((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [userId]: { ...prev[key][userId], [field]: value },
      },
    }));
  };

  const updateFilaGlobal = (key, field, value) => {
    setFilaGlobal((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const applyRowGlobal = (key, field) => {
    const value = filaGlobal[key]?.[field];
    if (value === "" || value === null || value === undefined) return;
    const objetivo = Object.keys(grid[key] || {}).filter((uid) =>
      sucursalesSel.includes(uid)
    );
    if (!objetivo.length) return;

    setGrid((prev) => {
      const next = { ...prev };
      const fila = { ...prev[key] };
      objetivo.forEach((uid) => {
        fila[uid] = { ...fila[uid], [field]: value };
      });
      next[key] = fila;
      return next;
    });

    const label = { precio_venta: "venta", precio_compra: "compra", stock: "stock" }[field] || field;
    const conMoneda = field === "stock" ? "" : "$";
    showNotification(
      `Precio de ${label} ${conMoneda}${value} aplicado a ${objetivo.length} sucursal(es)`,
      "success"
    );
  };

  const renderGlobales = (p) => {
    const gVenta = Number(filaGlobal[p.key]?.precio_venta) || 0;
    const gCompra = Number(filaGlobal[p.key]?.precio_compra) || 0;
    const globalCompraMayorVenta =
      gVenta > 0 && gCompra > 0 && gCompra > gVenta;
    const globalCls = `text-xs text-right ${textPrimary} ${placeholderCls}`;
    return (
      <div className="mt-1 flex flex-col gap-1">
        <div className="flex items-center">
          <input
            type="number"
            step="0.01"
            placeholder="Venta"
            value={filaGlobal[p.key]?.precio_venta ?? ""}
            onChange={(e) =>
              updateFilaGlobal(p.key, "precio_venta", e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") applyRowGlobal(p.key, "precio_venta");
            }}
            className={`w-full min-w-0 px-1 py-1 rounded-l border ${globalCls} ${
              globalCompraMayorVenta
                ? "border-red-500 bg-red-500/10"
                : "border-purple-500 bg-purple-500/10"
            }`}
          />
          <button
            onClick={() => applyRowGlobal(p.key, "precio_venta")}
            disabled={!filaGlobal[p.key]?.precio_venta}
            className="px-1 py-1 rounded-r bg-purple-500 text-white text-xs disabled:opacity-40"
            title="Aplicar precio de venta a todas las sucursales"
          >
            ⚡
          </button>
        </div>
        <div className="flex items-center">
          <input
            type="number"
            step="0.01"
            placeholder="Compra"
            value={filaGlobal[p.key]?.precio_compra ?? ""}
            onChange={(e) =>
              updateFilaGlobal(p.key, "precio_compra", e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") applyRowGlobal(p.key, "precio_compra");
            }}
            className={`w-full min-w-0 px-1 py-1 rounded-l border ${globalCls} ${
              globalCompraMayorVenta
                ? "border-red-500 bg-red-500/10"
                : "border-blue-500 bg-blue-500/10"
            }`}
          />
          <button
            onClick={() => applyRowGlobal(p.key, "precio_compra")}
            disabled={!filaGlobal[p.key]?.precio_compra}
            className="px-1 py-1 rounded-r bg-blue-500 text-white text-xs disabled:opacity-40"
            title="Aplicar precio de compra a todas las sucursales"
          >
            ⚡
          </button>
        </div>
        <div className="flex items-center">
          <input
            type="number"
            placeholder="Stock"
            value={filaGlobal[p.key]?.stock ?? ""}
            onChange={(e) => updateFilaGlobal(p.key, "stock", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyRowGlobal(p.key, "stock");
            }}
            className={`w-full min-w-0 px-1 py-1 rounded-l border ${globalCls} border-emerald-500 bg-emerald-500/10`}
          />
          <button
            onClick={() => applyRowGlobal(p.key, "stock")}
            disabled={!filaGlobal[p.key]?.stock}
            className="px-1 py-1 rounded-r bg-emerald-500 text-white text-xs disabled:opacity-40"
            title="Aplicar stock a todas las sucursales"
          >
            ⚡
          </button>
        </div>
      </div>
    );
  };

  const renderInputsSucursal = (p, u, cell) => {
    const compra = Number(cell.precio_compra) || 0;
    const venta = Number(cell.precio_venta) || 0;
    const compraMayorVenta = compra > 0 && venta > 0 && compra > venta;
    const ventaCls = compraMayorVenta
      ? "border-red-500 bg-red-500/10"
      : "border-purple-500/40 bg-purple-500/20";
    const compraCls = compraMayorVenta
      ? "border-red-500 bg-red-500/10"
      : "border-blue-500/40 bg-blue-500/20";
    const baseCls = `px-1 py-1 rounded border text-[11px] text-right ${textPrimary} ${placeholderCls}`;
    return (
      <>
        <div className="mt-1 flex flex-col gap-1">
          <input
            type="number"
            step="0.01"
            placeholder="Venta"
            title="Precio de venta"
            value={cell.precio_venta ?? ""}
            onChange={(e) => updateCell(p.key, u.id, "precio_venta", e.target.value)}
            className={`w-full ${baseCls} ${ventaCls}`}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Compra"
            title="Precio de compra"
            value={cell.precio_compra ?? ""}
            onChange={(e) => updateCell(p.key, u.id, "precio_compra", e.target.value)}
            className={`w-full ${baseCls} ${compraCls}`}
          />
          <input
            type="number"
            placeholder="Stock"
            title="Stock físico"
            value={cell.stock ?? ""}
            onChange={(e) => updateCell(p.key, u.id, "stock", e.target.value)}
            className={`w-full ${baseCls} border-emerald-500/40 bg-emerald-500/20`}
          />
        </div>
        {compraMayorVenta && (
          <span className="text-[10px] font-medium text-red-500">
            ⚠️ compra &gt; venta
          </span>
        )}
        {!cell.active && (
          <span className={`text-[10px] ${textSecondary}`}>inactivo</span>
        )}
      </>
    );
  };

  const renderDetalle = (p) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setProductoSeleccionado(null)}
          className={`text-xs font-medium ${textSecondary} hover:text-blue-400`}
        >
          ← Volver a productos
        </button>
        <div className="flex items-center gap-2">
          {p.image_url ? (
            <img
              src={publicUrl(p.image_url)}
              alt={p.name}
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          ) : (
            <div
              className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                dark ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              {p.tipo === "custom" ? "⭐" : "📦"}
            </div>
          )}
          <div>
            <p className={`font-medium text-xs ${textPrimary}`}>{p.name}</p>
            <p className={`text-[10px] ${textSecondary}`}>
              {p.tipo === "custom" ? "⭐ Custom" : "📦 Base"}
              {p.brand ? ` · ${p.brand}` : ""}
            </p>
          </div>
        </div>
      </div>

      {renderGlobales(p)}

      <div className="space-y-2">
        {usuarios
          .filter((u) => sucursalesSel.includes(u.id))
          .map((u) => {
            const cell = grid[p.key]?.[u.id];
            return (
              <div
                key={u.id}
                className={`flex items-center gap-3 p-2 rounded-lg border ${borderRow} ${
                  !cell?.active ? "opacity-50" : ""
                }`}
              >
                <div className="w-36 shrink-0">
                  <p className={`text-xs font-medium truncate ${textPrimary}`}>
                    {u.name}
                  </p>
                  {cell && !cell.active && (
                    <p className={`text-[10px] ${textSecondary}`}>inactivo</p>
                  )}
                  {cell?.destacado && (
                    <p className="text-[10px] font-medium text-yellow-500">
                      ⭐ destacado
                    </p>
                  )}
                </div>
                {cell ? (
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex justify-end">
                      <StarToggle
                        on={cell.destacado}
                        onClick={() =>
                          updateCell(p.key, u.id, "destacado", !cell.destacado)
                        }
                      />
                    </div>
                    {renderInputsSucursal(p, u, cell)}
                  </div>
                ) : (
                  <button
                    onClick={() => handleAgregarSucursal(p, u.id, u.name)}
                    disabled={agregando}
                    className="px-2 py-1 rounded text-[10px] font-medium text-green-500 border border-green-500/40 hover:bg-green-500/10 transition-colors disabled:opacity-40"
                    title="Agregar producto a esta sucursal"
                  >
                    ➕ Agregar
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );

  async function handleAgregarSucursal(p, userId, userName) {
    if (
      !confirm(
        `¿Agregar "${p.name}" a la sucursal de ${userName}?\n\nVa a crearse con los precios de referencia y stock en 0.`
      )
    )
      return;

    const global = filaGlobal[p.key] || {};
    const gVenta = Number(global.precio_venta);
    const gCompra = Number(global.precio_compra);
    const primera = Object.values(grid[p.key] || {})[0];
    const precioVenta = gVenta > 0 ? gVenta : Number(primera?.precio_venta) || 0;
    const precioCompra = gCompra > 0 ? gCompra : Number(primera?.precio_compra) || 0;

    const payload = {
      user_id: userId,
      active: true,
      precio_venta: precioVenta,
      precio_compra: precioCompra,
      stock: 0,
      destacado: false,
    };
    if (p.tipo === "base") payload.base_id = p.id;
    else payload.custom_id = p.id;

    setAgregando(true);

    try {
      const { data, error } = await supabase
        .from("user_products")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      const nueva = {
        upId: data.id,
        precio_venta: precioVenta,
        precio_compra: precioCompra,
        stock: 0,
        active: true,
        destacado: false,
      };

      setGrid((prev) => ({
        ...prev,
        [p.key]: { ...prev[p.key], [userId]: nueva },
      }));
      setOriginal((prev) => ({
        ...prev,
        [p.key]: { ...prev[p.key], [userId]: nueva },
      }));

      await invalidateUserProducts(userId);
      showNotification(`"${p.name}" agregado a la sucursal de ${userName}`);
    } catch (err) {
      console.error("Error agregando producto a sucursal:", err);
      showNotification("Error al agregar el producto", "error");
    } finally {
      setAgregando(false);
    }
  }

  const catDe = (p) => p.category || "(Sin categoría)";
  const subDe = (p) => p.subcategory || "(Sin subcategoría)";
  const marcaDe = (p) => p.brand || "(Sin marca)";

  const opcionesCategorias = useMemo(() => {
    const m = new Map();
    productos.forEach((p) => {
      const n = catDe(p);
      m.set(n, (m.get(n) || 0) + 1);
    });
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productos]);

  const opcionesSubcategorias = useMemo(() => {
    const m = new Map();
    productos
      .filter((p) => filtroCategoria === "todos" || catDe(p) === filtroCategoria)
      .forEach((p) => {
        const n = subDe(p);
        m.set(n, (m.get(n) || 0) + 1);
      });
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productos, filtroCategoria]);

  const opcionesMarcas = useMemo(() => {
    const m = new Map();
    productos
      .filter((p) => filtroCategoria === "todos" || catDe(p) === filtroCategoria)
      .filter(
        (p) => filtroSubcategoria === "todos" || subDe(p) === filtroSubcategoria
      )
      .forEach((p) => {
        const n = marcaDe(p);
        m.set(n, (m.get(n) || 0) + 1);
      });
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productos, filtroCategoria, filtroSubcategoria]);

  const productosVisibles = useMemo(() => {
    const lower = search.toLowerCase();
    return productos.filter((p) => {
      const celdas = Object.keys(grid[p.key] || {}).filter((uid) =>
        sucursalesSel.includes(uid)
      );
      if (!celdas.length) return false;
      if (soloCompartidos && celdas.length < sucursalesSel.length) return false;
      if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
      if (filtroCategoria !== "todos" && catDe(p) !== filtroCategoria) return false;
      if (
        filtroSubcategoria !== "todos" &&
        subDe(p) !== filtroSubcategoria
      )
        return false;
      if (filtroMarca !== "todos" && marcaDe(p) !== filtroMarca) return false;
      if (search && !p.name.toLowerCase().includes(lower)) return false;
      return true;
    });
  }, [
    productos,
    grid,
    sucursalesSel,
    filtroTipo,
    filtroCategoria,
    filtroSubcategoria,
    filtroMarca,
    search,
    soloCompartidos,
  ]);

  const conteoModificaciones = useMemo(() => {
    let count = 0;
    Object.entries(grid).forEach(([key, porU]) => {
      Object.entries(porU).forEach(([uid, cell]) => {
        if (!sucursalesSel.includes(uid)) return;
        const orig = original[key]?.[uid];
        if (!orig) return;
        if (
          Number(cell.precio_venta) !== Number(orig.precio_venta) ||
          Number(cell.precio_compra) !== Number(orig.precio_compra) ||
          Number(cell.stock) !== Number(orig.stock) ||
          cell.destacado !== orig.destacado
        ) {
          count++;
        }
      });
    });
    return count;
  }, [grid, original, sucursalesSel]);

  const conteoDiscrepancias = useMemo(() => {
    let count = 0;
    Object.entries(grid).forEach(([, porU]) => {
      Object.entries(porU).forEach(([uid, cell]) => {
        if (!sucursalesSel.includes(uid)) return;
        const c = Number(cell.precio_compra) || 0;
        const v = Number(cell.precio_venta) || 0;
        if (c > 0 && v > 0 && c > v) count++;
      });
    });
    return count;
  }, [grid, sucursalesSel]);

  async function handleGuardar() {
    if (conteoModificaciones === 0) {
      showNotification("No hay cambios para guardar", "warning");
      return;
    }

    if (
      !confirm(
        `Se van a actualizar ${conteoModificaciones} registro(s) en las sucursales seleccionadas. ¿Continuar?`
      )
    )
      return;

    const cambios = [];
    const usuariosTocados = new Set();

    Object.entries(grid).forEach(([key, porU]) => {
      Object.entries(porU).forEach(([uid, cell]) => {
        if (!sucursalesSel.includes(uid)) return;
        const orig = original[key]?.[uid];
        if (!orig) return;
        const pv = Number(cell.precio_venta) || 0;
        const pc = Number(cell.precio_compra) || 0;
        const st = Number(cell.stock) || 0;
        if (
          pv !== Number(orig.precio_venta) ||
          pc !== Number(orig.precio_compra) ||
          st !== Number(orig.stock) ||
          cell.destacado !== orig.destacado
        ) {
          cambios.push({
            id: cell.upId,
            precio_venta: pv,
            precio_compra: pc,
            stock: st,
            destacado: cell.destacado,
          });
          usuariosTocados.add(uid);
        }
      });
    });

    setSaving(true);

    try {
      const res = await Promise.all(
        cambios.map((c) =>
          supabase
            .from("user_products")
            .update({
              precio_venta: c.precio_venta,
              precio_compra: c.precio_compra,
              stock: c.stock,
              destacado: c.destacado,
            })
            .eq("id", c.id)
        )
      );

      const conError = res.filter((r) => r.error);
      if (conError.length) throw conError[0].error;

      await Promise.all(
        [...usuariosTocados].map((uid) => invalidateUserProducts(uid))
      );
      await load();
      showNotification(`${cambios.length} registro(s) actualizados`);
    } catch (err) {
      console.error("Error guardando:", err);
      showNotification("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse text-xl">Cargando sucursales...</div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className={`text-center py-12 ${textSecondary}`}>
        <div className="text-5xl mb-4">🏢</div>
        <p>No hay un negocio definido para editar en lote</p>
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

      <div className={`rounded-xl p-3 mb-4 ${baseCard} border`}>
        {esSuperAdmin && (
          <div className="flex items-center gap-2 mb-3">
            <label className={`text-xs font-medium ${textSecondary}`}>
              Negocio
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${textPrimary} ${inputBg} ${borderColor}`}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <p className={`text-sm font-medium ${textPrimary}`}>
            Sucursales del negocio
          </p>
          <button
            onClick={toggleTodasLasSucursales}
            className={`text-xs ${textSecondary} hover:text-blue-400`}
          >
            {sucursalesSel.length === usuarios.length
              ? "Deseleccionar todas"
              : "Seleccionar todas"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {usuarios.map((u) => {
            const activa = sucursalesSel.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleSucursal(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activa
                    ? "bg-blue-500 text-white border-blue-500"
                    : `${inputBg} ${borderColor} ${textSecondary} hover:border-blue-400`
                }`}
              >
                {u.name}
              </button>
            );
          })}
        </div>

        {sucursalesSel.length === 0 && (
          <p className={`text-xs mt-2 text-yellow-500`}>
            Seleccioná al menos una sucursal para ver sus productos.
          </p>
        )}
      </div>

      {sucursalesSel.length > 0 && (
        <>
          <div className={`rounded-xl p-3 mb-4 ${baseCard} border`}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex gap-2">
                {[
                  { id: "todos", label: "Todos", cls: "bg-blue-500" },
                  { id: "base", label: "📦 Base", cls: "bg-blue-500" },
                  { id: "custom", label: "⭐ Custom", cls: "bg-purple-500" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFiltroTipo(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filtroTipo === t.id
                        ? `${t.cls} text-white shadow`
                        : `${textSecondary} hover:${textPrimary}`
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className={`flex gap-1 p-1 rounded-xl ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
                  <button
                    onClick={() => setSoloCompartidos(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      !soloCompartidos
                        ? "bg-blue-500 text-white shadow"
                        : `${textSecondary}`
                    }`}
                  >
                    🌐 Todos
                  </button>
                  <button
                    onClick={() => setSoloCompartidos(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      soloCompartidos
                        ? "bg-teal-500 text-white shadow"
                        : `${textSecondary}`
                    }`}
                  >
                    🔗 Compartidos
                  </button>
                </div>

                <div className={`hidden lg:flex gap-1 p-1 rounded-xl ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
                  <button
                    onClick={() => setVista("tabla")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      vista === "tabla"
                        ? "bg-blue-500 text-white shadow"
                        : `${textSecondary}`
                    }`}
                  >
                    📋 Tabla
                  </button>
                  <button
                    onClick={() => setVista("porProducto")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      vista === "porProducto"
                        ? "bg-blue-500 text-white shadow"
                        : `${textSecondary}`
                    }`}
                  >
                    📄 Por producto
                  </button>
                </div>
              </div>
            </div>

    <div className="relative min-w-0 w-full">
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full p-2.5 pl-10 rounded-lg border text-sm ${textPrimary} ${inputBg} ${borderColor} ${placeholderCls}`}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <select
                value={filtroCategoria}
                onChange={(e) => {
                  setFiltroCategoria(e.target.value);
                  setFiltroSubcategoria("todos");
                }}
                className={`flex-1 min-w-32 px-3 py-2 rounded-lg border text-sm ${textPrimary} ${inputBg} ${borderColor}`}
              >
                <option value="todos">🗂️ Categoría: todas</option>
                {opcionesCategorias.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>

              <select
                value={filtroSubcategoria}
                onChange={(e) => setFiltroSubcategoria(e.target.value)}
                className={`flex-1 min-w-32 px-3 py-2 rounded-lg border text-sm ${textPrimary} ${inputBg} ${borderColor}`}
              >
                <option value="todos">📂 Subcategoría: todas</option>
                {opcionesSubcategorias.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </select>

              <select
                value={filtroMarca}
                onChange={(e) => setFiltroMarca(e.target.value)}
                className={`flex-1 min-w-32 px-3 py-2 rounded-lg border text-sm ${textPrimary} ${inputBg} ${borderColor}`}
              >
                <option value="todos">🏷️ Marca: todas</option>
                {opcionesMarcas.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px]">
              <span className={textSecondary}>Asignación rápida (fila):</span>
              <span className="px-1.5 py-0.5 rounded border border-purple-500 bg-purple-500/10 text-purple-400">
                ⚡ Venta
              </span>
              <span className="px-1.5 py-0.5 rounded border border-blue-500 bg-blue-500/10 text-blue-400">
                ⚡ Compra
              </span>
              <span className="px-1.5 py-0.5 rounded border border-emerald-500 bg-emerald-500/10 text-emerald-400">
                ⚡ Stock
              </span>
              <span className={textSecondary}>
                aplica el mismo valor a todas las sucursales
              </span>
              <span className={`${textSecondary}`}>·</span>
              <span className={`${textSecondary}`}>
                celdas con tono suave = individual por sucursal
              </span>
              <span className={`${textSecondary}`}>·</span>
              <span className={`text-green-500`}>
                ➕ en celda vacía = agregar producto a esa sucursal
              </span>
            </div>
          </div>

          {productosVisibles.length === 0 ? (
            <div className={`text-center py-12 ${textSecondary}`}>
              <div className="text-5xl mb-4">📦</div>
              <p>No hay productos en las sucursales seleccionadas</p>
            </div>
          ) : (
            <div
              className={`rounded-xl border ${baseCard}`}
            >
              <div
                ref={tablaScrollRef}
                onMouseDown={onDragStart}
                onMouseMove={onDragMove}
                onMouseUp={onDragEnd}
                onMouseLeave={onDragEnd}
                className={`overflow-x-auto overflow-hidden cursor-grab ${
                  arrastrando ? "cursor-grabbing select-none" : ""
                } ${vista === "tabla" ? "hidden lg:block" : "hidden"}`}
              >
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className={`border-b ${borderRow}`}>
                      <th
                        className={`text-left p-2 font-medium ${textSecondary} sticky left-0 top-0 z-30 ${stickyBg} border-r ${borderRow}`}
                      >
                        Producto
                      </th>
                      {usuarios
                        .filter((u) => sucursalesSel.includes(u.id))
                        .map((u) => (
                          <th
                            key={u.id}
                            className={`p-1.5 font-medium text-center ${textSecondary} min-w-24 sticky top-0 z-10 ${stickyBg}`}
                          >
                            {u.name}
                            <span className="block text-[10px]">
                              venta · compra · stock
                            </span>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productosVisibles.map((p) => {
                      const totales = Object.keys(grid[p.key] || {}).filter(
                        (uid) => sucursalesSel.includes(uid)
                      ).length;
                      return (
                        <tr
                          key={p.key}
                          className={`border-b ${borderRow} align-top`}
                        >
                          <td
                            className={`p-2 min-w-28 sticky left-0 z-10 ${stickyBg} border-r ${borderRow}`}
                          >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {p.image_url ? (
                        <img
                          src={publicUrl(p.image_url)}
                          alt={p.name}
                          className="w-6 h-6 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-sm ${
                            dark ? "bg-gray-700" : "bg-gray-100"
                          }`}
                        >
                                  {p.tipo === "custom" ? "⭐" : "📦"}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className={`font-medium text-xs truncate ${textPrimary}`}>
                                  {p.name}
                                </p>
                                <p className={`text-[10px] ${textSecondary}`}>
                                  {p.tipo === "custom" ? "⭐ Custom" : "📦 Base"}
                                  {p.brand ? ` · ${p.brand}` : ""} ·{" "}
                                  {totales} sucursal(es)
                                </p>
                              </div>
                            </div>

                            {renderGlobales(p)}
                          </td>

                          {usuarios
                            .filter((u) => sucursalesSel.includes(u.id))
                            .map((u) => {
                              const cell = grid[p.key]?.[u.id];
                              if (!cell) {
                                return (
                                  <td
                                    key={u.id}
                                    className={`p-2 text-center align-middle ${
                                      dark ? "bg-gray-900/40" : "bg-gray-50"
                                    }`}
                                  >
                                    <button
                                      onClick={() =>
                                        handleAgregarSucursal(p, u.id, u.name)
                                      }
                                      disabled={agregando}
                                      className="px-2 py-1 rounded text-[10px] font-medium text-green-500 border border-green-500/40 hover:bg-green-500/10 transition-colors disabled:opacity-40"
                                      title="Agregar producto a esta sucursal"
                                    >
                                      ➕ Agregar
                                    </button>
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={u.id}
                                  className={`p-2 ${!cell.active ? "opacity-50" : ""}`}
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="h-6 shrink-0 flex items-center justify-end">
                                      <StarToggle
                                        on={cell.destacado}
                                        onClick={() =>
                                          updateCell(
                                            p.key,
                                            u.id,
                                            "destacado",
                                            !cell.destacado
                                          )
                                        }
                                      />
                                    </div>
                                    {renderInputsSucursal(p, u, cell)}
                                  </div>
                                </td>
                              );
                            })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={vista === "porProducto" ? "block" : "lg:hidden"}>
                <div className="p-3">
                  {!productoSeleccionado ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {productosVisibles.map((p) => {
                        const tot = Object.keys(grid[p.key] || {}).filter(
                          (uid) => sucursalesSel.includes(uid)
                        ).length;
                        return (
                          <button
                            key={p.key}
                            onClick={() => setProductoSeleccionado(p)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${baseCard} hover:border-blue-400`}
                          >
                            {p.image_url ? (
                              <img
                                src={publicUrl(p.image_url)}
                                alt={p.name}
                                className="w-8 h-8 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                                  dark ? "bg-gray-700" : "bg-gray-100"
                                }`}
                              >
                                {p.tipo === "custom" ? "⭐" : "📦"}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium text-xs truncate ${textPrimary}`}>
                                {p.name}
                              </p>
                              <p className={`text-[10px] ${textSecondary}`}>
                                {p.tipo === "custom" ? "⭐ Custom" : "📦 Base"}
                                {p.brand ? ` · ${p.brand}` : ""} · {tot}{" "}
                                sucursal(es)
                              </p>
                            </div>
                            <span className={`text-xs ${textSecondary}`}>
                              ✏️
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="hidden lg:block">
                      {renderDetalle(productoSeleccionado)}
                    </div>
                  )}
                </div>
              </div>

              {productoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center lg:hidden">
                  <div
                    className="absolute inset-0 bg-black/60"
                    onClick={() => setProductoSeleccionado(null)}
                  />
                  <div
                    className={`relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border ${baseCard} p-4`}
                  >
                    {renderDetalle(productoSeleccionado)}
                  </div>
                </div>
              )}
              <div
                className={`h-24 lg:h-20 ${stickyBg}`}
                aria-hidden="true"
              />
            </div>
          )}

          {productosVisibles.length > 0 && (
            <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
              {conteoModificaciones > 0 && (
                <span
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium shadow-lg border ${baseCard}`}
                >
                  <b className={textPrimary}>{conteoModificaciones}</b>
                  <span className={textSecondary}>
                    {" "}
                    mod{conteoDiscrepancias > 0 ? " · " : ""}
                  </span>
                  {conteoDiscrepancias > 0 && (
                    <span className="text-red-500">⚠️ {conteoDiscrepancias}</span>
                  )}
                </span>
              )}
              <button
                onClick={handleGuardar}
                disabled={saving || conteoModificaciones === 0}
                className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold shadow-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <span className="animate-spin inline-block">⟳</span>{" "}
                    Guardando...
                  </>
                ) : (
                  <>💾 Guardar</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
