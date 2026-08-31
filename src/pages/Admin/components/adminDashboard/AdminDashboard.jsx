import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useAppContext } from "../../../../contexto/Context";
import { supabase } from "../../../../services/supabaseClient";
import { sumStockTalles } from "../productsBase/components/StockPorTalle";

const UMBRAL_STOCK_BAJO = 5;

export function AdminDashboard() {
  const { preferencias, profile } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const esSuperAdmin = profile?.role === "super_admin";

  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [data, setData] = useState(null);
  const [ventasData, setVentasData] = useState(null);
  const [tenantUserIds, setTenantUserIds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [dias, setDias] = useState(14);
  const reqBaseRef = useRef(0);
  const reqVentasRef = useRef(0);

  useEffect(() => {
    if (!esSuperAdmin) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name")
          .order("id", { ascending: false });
        if (error) throw error;
        setTenants(data || []);
        setSelectedTenantId((prev) => prev || data?.[0]?.id || "");
      } catch (err) {
        console.error("Error cargando negocios:", err.message);
      }
    })();
  }, [esSuperAdmin]);

  // --- Carga base: no depende del período seleccionado ---
  const loadBase = useCallback(async () => {
    const tid = esSuperAdmin ? selectedTenantId : profile?.tenant_id;
    if (!tid) {
      setData(null);
      setTenantUserIds(null);
      setLoading(false);
      return;
    }

    const req = ++reqBaseRef.current;
    const commit = (d) => {
      if (reqBaseRef.current === req) setData(d);
    };
    setLoading(true);

    try {
      const [usersRes, prodsCount, catsCount, brandsCount] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, role, created_at")
          .eq("tenant_id", tid),
        supabase.from("products_base").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }),
      ]);
      if (usersRes.error) throw usersRes.error;

      const users = usersRes.data || [];
      const userIds = users.map((u) => u.id);

      let pendientes = [];
      let pedidosCount = 0;
      let stockRows = [];

      if (userIds.length) {
        const [pendRes, pedidosRes, stockRes] = await Promise.all([
          supabase
            .from("user_sales")
            .select("monto_total, fecha")
            .in("user_id", userIds)
            .eq("estado", "pendiente"),
          supabase
            .from("pedidos")
            .select("id", { count: "exact", head: true })
            .in("profile_id", userIds)
            .eq("estado", "pendiente"),
          supabase
            .from("user_products")
            .select(
              "stock, stock_talles, active, products_base(name), user_custom_products(name)"
            )
            .in("user_id", userIds),
        ]);

        if (pendRes.error) console.warn("dashboard pendientes:", pendRes.error.message);
        if (pedidosRes.error) console.warn("dashboard pedidos:", pedidosRes.error.message);
        if (stockRes.error) console.warn("dashboard stock:", stockRes.error.message);

        pendientes = pendRes.data || [];
        pedidosCount = pedidosRes.count ?? 0;
        stockRows = stockRes.data || [];
      }

      // --- Cobros pendientes ---
      const porCobrarMonto = pendientes.reduce(
        (acc, v) => acc + (Number(v.monto_total) || 0),
        0
      );
      const fechasPend = pendientes
        .map((v) => v.fecha)
        .filter(Boolean)
        .sort();
      const porCobrarMasVieja = fechasPend[0] || null;

      // --- Stock bajo ---
      const stockBajo = stockRows
        .filter((p) => p.active !== false)
        .map((p) => ({
          nombre:
            p.products_base?.name ||
            p.user_custom_products?.name ||
            "(sin nombre)",
          stockEfectivo: Object.keys(p.stock_talles || {}).length
            ? sumStockTalles(p.stock_talles)
            : Number(p.stock) || 0,
        }))
        .filter((p) => p.stockEfectivo <= UMBRAL_STOCK_BAJO)
        .sort((a, b) => a.stockEfectivo - b.stockEfectivo)
        .slice(0, 5);

      commit({
        totalUsers: users.length,
        totalProductsBase: prodsCount.count ?? 0,
        totalCategories: catsCount.count ?? 0,
        totalBrands: brandsCount.count ?? 0,
        porCobrarMonto,
        porCobrarN: pendientes.length,
        porCobrarMasVieja,
        pedidosPendientes: pedidosCount,
        stockBajo,
      });

      if (reqBaseRef.current === req) setTenantUserIds(userIds);
    } catch (err) {
      console.error("Error cargando dashboard:", err.message);
      if (reqBaseRef.current === req) {
        setData(null);
        setTenantUserIds(null);
      }
    } finally {
      if (reqBaseRef.current === req) setLoading(false);
    }
  }, [esSuperAdmin, selectedTenantId, profile?.tenant_id]);

  // --- Ventas: única parte que depende del período (`dias`) ---
  const loadVentas = useCallback(async () => {
    const tid = esSuperAdmin ? selectedTenantId : profile?.tenant_id;
    if (!tid || tenantUserIds === null) return;

    const req = ++reqVentasRef.current;
    const commit = (d) => {
      if (reqVentasRef.current === req) setVentasData(d);
    };
    setLoadingVentas(true);

    try {
      if (!tenantUserIds.length) {
        commit({ factHoy: 0, nVentasHoy: 0, factAyer: 0, diasGrafico: [], topProductos: [] });
        return;
      }

      const hoy = dayjs().startOf("day");
      const desde = hoy.subtract(dias - 1, "day").format("YYYY-MM-DD");

      const [ventasRes, detRes] = await Promise.all([
        supabase
          .from("user_sales")
          .select("fecha, monto_total")
          .in("user_id", tenantUserIds)
          .gte("fecha", desde)
          .eq("estado", "confirmado"),
        supabase
          .from("user_sales_detail")
          .select(
            `
            cantidad,
            precio_unitario,
            user_sales!inner ( estado, fecha ),
            user_products ( products_base ( name ), user_custom_products ( name ) )
          `
          )
          .gte("user_sales.fecha", desde)
          .eq("user_sales.estado", "confirmado"),
      ]);

      if (ventasRes.error) console.warn("dashboard ventas:", ventasRes.error.message);
      if (detRes.error) console.warn("dashboard top productos:", detRes.error.message);

      // --- Facturación hoy/ayer + gráfico de `dias` días ---
      const hoyKey = hoy.format("YYYY-MM-DD");
      const ayerKey = hoy.subtract(1, "day").format("YYYY-MM-DD");
      let factHoy = 0;
      let nVentasHoy = 0;
      let factAyer = 0;
      const totalesPorDia = {};

      (ventasRes.data || []).forEach((v) => {
        const key = dayjs(v.fecha).format("YYYY-MM-DD");
        const monto = Number(v.monto_total) || 0;
        totalesPorDia[key] = (totalesPorDia[key] || 0) + monto;
        if (key === hoyKey) {
          factHoy += monto;
          nVentasHoy += 1;
        } else if (key === ayerKey) {
          factAyer += monto;
        }
      });

      const diasGrafico = Array.from({ length: dias }, (_, i) => {
        const d = hoy.subtract(dias - 1 - i, "day");
        return {
          key: d.format("YYYY-MM-DD"),
          label: d.format("D"),
          titulo: d.format("ddd D [de] MMMM"),
          total: totalesPorDia[d.format("YYYY-MM-DD")] || 0,
        };
      });

      // --- Top productos (`dias` días) ---
      const mapaTop = {};
      (detRes.data || []).forEach((d) => {
        const nombre =
          d.user_products?.products_base?.name ||
          d.user_products?.user_custom_products?.name;
        if (!nombre) return;
        const cant = Number(d.cantidad) || 0;
        if (!mapaTop[nombre]) {
          mapaTop[nombre] = { nombre, unidades: 0, facturado: 0 };
        }
        mapaTop[nombre].unidades += cant;
        mapaTop[nombre].facturado += cant * (Number(d.precio_unitario) || 0);
      });
      const topProductos = Object.values(mapaTop)
        .sort((a, b) => b.unidades - a.unidades)
        .slice(0, 5);

      commit({ factHoy, nVentasHoy, factAyer, diasGrafico, topProductos });
    } catch (err) {
      console.error("Error cargando ventas del dashboard:", err.message);
    } finally {
      if (reqVentasRef.current === req) setLoadingVentas(false);
    }
  }, [esSuperAdmin, selectedTenantId, profile?.tenant_id, dias, tenantUserIds]);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadVentas();
  }, [loadVentas]);

  const fmt$ = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-white text-gray-900 border-gray-300";

  if (!esSuperAdmin && !profile?.tenant_id) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <span>Tu usuario no está asociado a ningún negocio</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <span className="text-lg animate-pulse">Cargando dashboard...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>Dashboard</h1>
        <div className={`rounded-xl border p-6 text-center ${bgCard} ${textSecondary}`}>
          {esSuperAdmin
            ? "Elegí un negocio arriba para ver sus métricas."
            : "No se pudieron cargar los datos."}
        </div>
      </div>
    );
  }

  const v =
    ventasData ?? { factHoy: 0, nVentasHoy: 0, factAyer: 0, diasGrafico: [], topProductos: [] };
  const dimVentas = loadingVentas
    ? "opacity-50 pointer-events-none"
    : "transition-opacity";

  const deltaPct =
    v.factAyer > 0 ? Math.round(((v.factHoy - v.factAyer) / v.factAyer) * 100) : null;
  const maxDia = Math.max(...v.diasGrafico.map((d) => d.total), 1);
  const hoyRenderKey = dayjs().format("YYYY-MM-DD");

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          {esSuperAdmin && (
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${inputBg}`}
            >
              {tenants.length === 0 && <option value="">Sin negocios</option>}
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  🏪 {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              loadBase();
              loadVentas();
            }}
            title="Refrescar datos"
            className={`px-2.5 py-2 rounded-lg border text-sm transition-colors ${
              dark
                ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            ⟳
          </button>
        </div>
      </div>

      {/* MÉTRICAS DEL SISTEMA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard dark={dark} icon="👥" label="Usuarios" value={data.totalUsers} color="blue" />
        <MetricCard dark={dark} icon="📦" label="Productos base" value={data.totalProductsBase} color="green" />
        <MetricCard dark={dark} icon="🏷️" label="Categorías" value={data.totalCategories} color="purple" />
        <MetricCard dark={dark} icon="🏪" label="Marcas" value={data.totalBrands} color="yellow" />
      </div>

      {/* DINERO + ACCIÓN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className={dimVentas}>
          <MoneyCard
            dark={dark}
            icon="💰"
            label="Ventas de hoy"
            value={fmt$(v.factHoy)}
            sub={
              <span className="flex items-center gap-1.5 flex-wrap">
                <span>
                  {v.nVentasHoy} venta{v.nVentasHoy === 1 ? "" : "s"}
                </span>
                {deltaPct !== null ? (
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                      deltaPct >= 0
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct)}% vs ayer (
                    {fmt$(v.factAyer)})
                  </span>
                ) : (
                  <span>· ayer {fmt$(v.factAyer)}</span>
                )}
              </span>
            }
            color="green"
          />
        </div>

        <MoneyCard
          dark={dark}
          icon="⏳"
          label="Por cobrar"
          value={fmt$(data.porCobrarMonto)}
          sub={
            <>
              {data.porCobrarN} venta{data.porCobrarN === 1 ? "" : "s"} pendiente
              {data.porCobrarN === 1 ? "" : "s"}
              {data.porCobrarMasVieja &&
                ` · la más vieja del ${dayjs(data.porCobrarMasVieja).format("D/MM")}`}
            </>
          }
          color={data.porCobrarN > 0 ? "yellow" : "gray"}
        />

        {data.pedidosPendientes > 0 ? (
          <Link to="/pedidos-web" className="block">
            <MoneyCard
              dark={dark}
              icon="📥"
              label="Pedidos web"
              value={String(data.pedidosPendientes)}
              sub="Esperando confirmación · procesar →"
              color="blue"
              hover
            />
          </Link>
        ) : (
          <MoneyCard
            dark={dark}
            icon="📥"
            label="Pedidos web"
            value="0"
            sub="Sin pedidos pendientes"
            color="gray"
          />
        )}
      </div>

      {/* GRÁFICO + STOCK BAJO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className={`rounded-xl border p-4 lg:col-span-2 ${bgCard}`}>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <h2 className={`font-bold text-base md:text-lg ${textPrimary}`}>
              📈 Facturación últimos {dias} días
            </h2>
            <div
              className={`flex rounded-lg overflow-hidden border text-xs font-semibold ${
                dark ? "border-gray-600" : "border-gray-300"
              }`}
            >
              {[14, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDias(n)}
                  disabled={loadingVentas}
                  className={`px-3 py-1 transition-colors ${
                    dias === n
                      ? "bg-blue-500 text-white"
                      : dark
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {n} días
                </button>
              ))}
            </div>
          </div>
          <div className={`overflow-x-auto pb-1 ${dimVentas}`}>
            <div className="flex items-end gap-1 h-32 w-max min-w-full">
              {v.diasGrafico.map((d) => (
                <div
                  key={d.key}
                  title={`${d.titulo} · ${d.total > 0 ? fmt$(d.total) : "sin ventas"}`}
                  className="w-5 shrink-0 h-full flex flex-col justify-end items-center gap-1 cursor-default group"
                >
                  <span
                    className={`text-[9px] leading-none opacity-0 group-hover:opacity-100 transition-opacity ${
                      dark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {d.total > 0 ? fmt$(d.total) : ""}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all group-hover:opacity-80 ${
                      d.key === hoyRenderKey
                        ? "bg-emerald-500"
                        : dark
                          ? "bg-blue-500/50"
                          : "bg-blue-400/70"
                    }`}
                    style={{
                      height: `${Math.max((d.total / maxDia) * 100, d.total > 0 ? 4 : 1.5)}%`,
                    }}
                  />
                  <span className={`text-[9px] leading-none ${textSecondary}`}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-4 flex flex-col ${bgCard}`}>
          <h2 className={`font-bold text-base md:text-lg mb-4 ${textPrimary}`}>
            ⚠️ Stock bajo
          </h2>
          {data.stockBajo.length === 0 ? (
            <p className={`text-sm py-4 text-center ${textSecondary}`}>
              Todo con buen stock
            </p>
          ) : (
            <ul className="space-y-2 flex-1">
              {data.stockBajo.map((p) => (
                <li
                  key={p.nombre}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg ${
                    dark ? "bg-gray-700/50" : "bg-gray-50"
                  }`}
                >
                  <span className={`text-sm truncate ${textPrimary}`} title={p.nombre}>
                    {p.nombre}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.stockEfectivo <= 0
                        ? "bg-red-500/20 text-red-500"
                        : p.stockEfectivo <= 2
                          ? "bg-orange-500/20 text-orange-500"
                          : "bg-yellow-500/20 text-yellow-600"
                    }`}
                  >
                    {p.stockEfectivo <= 0 ? "Sin stock" : `${p.stockEfectivo} ud`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/assign"
            className="block mt-3 text-center text-sm text-blue-500 hover:text-blue-400"
          >
            Reponer stock →
          </Link>
        </div>
      </div>

      {/* TOP PRODUCTOS */}
      <div className={`rounded-xl border p-4 ${bgCard} ${dimVentas}`}>
        <h2 className={`font-bold text-base md:text-lg mb-4 ${textPrimary}`}>
          🏆 Top productos ({dias} días)
        </h2>
        {v.topProductos.length === 0 ? (
          <p className={`text-sm py-4 text-center ${textSecondary}`}>
            Sin ventas registradas en el período
          </p>
        ) : (
          <ol className="space-y-2">
            {v.topProductos.map((p, i) => (
              <li
                key={p.nombre}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg ${
                  dark ? "bg-gray-700/50" : "bg-gray-50"
                }`}
              >
                <span
                  className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0
                      ? "bg-yellow-500/25 text-yellow-600"
                      : i === 1
                        ? "bg-gray-400/25 text-gray-500"
                        : i === 2
                          ? "bg-orange-500/20 text-orange-600"
                          : dark
                            ? "bg-gray-600 text-gray-300"
                            : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`flex-1 text-sm truncate ${textPrimary}`} title={p.nombre}>
                  {p.nombre}
                </span>
                <span className={`shrink-0 text-xs ${textSecondary}`}>
                  {fmt$(p.facturado)}
                </span>
                <span className={`shrink-0 text-sm font-bold ${textPrimary}`}>
                  {p.unidades} u
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h2 className={`font-bold text-base md:text-lg mb-4 ${textPrimary}`}>
          ⚡ Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <QuickAction dark={dark} icon="👥" label="Usuarios" to="/admin/users" color="blue" />
          <QuickAction dark={dark} icon="📦" label="Productos" to="/admin/prods-base" color="green" />
          <QuickAction dark={dark} icon="🔗" label="Asignar" to="/admin/assign" color="purple" />
          <QuickAction dark={dark} icon="📥" label="Pedidos web" to="/pedidos-web" color="yellow" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ dark, icon, label, value, color }) {
  const colors = {
    blue: dark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200",
    green: dark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200",
    purple: dark ? "bg-purple-900/30 border-purple-700" : "bg-purple-50 border-purple-200",
    yellow: dark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200",
  };
  const textSecondaryColor = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`p-3 md:p-4 rounded-xl border-2 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1 md:mb-2">
        <span className="text-xl md:text-2xl">{icon}</span>
        <span className={`text-xs md:text-sm ${textSecondaryColor}`}>{label}</span>
      </div>
      <span className={`text-2xl md:text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

function MoneyCard({ dark, icon, label, value, sub, color, hover }) {
  const colors = {
    green: dark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200",
    yellow: dark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200",
    blue: dark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200",
    gray: dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
  };
  const textSecondaryColor = dark ? "text-gray-400" : "text-gray-500";
  const valueColor = color === "gray" ? (dark ? "text-gray-400" : "text-gray-500") : "";

  return (
    <div
      className={`p-3 md:p-4 rounded-xl border-2 ${colors[color]} ${
        hover ? "transition-all hover:scale-[1.02] cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl md:text-2xl">{icon}</span>
        <span className={`text-xs md:text-sm ${textSecondaryColor}`}>{label}</span>
      </div>
      <div className={`flex items-baseline gap-2 flex-wrap`}>
        <span className={`text-2xl md:text-3xl font-bold ${valueColor || (dark ? "text-white" : "text-gray-900")}`}>
          {value}
        </span>
      </div>
      <div className={`text-xs mt-1 ${textSecondaryColor}`}>{sub}</div>
    </div>
  );
}

function QuickAction({ icon, label, to, color }) {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-500",
    green: "bg-green-600 hover:bg-green-500",
    purple: "bg-purple-600 hover:bg-purple-500",
    yellow: "bg-yellow-500 hover:bg-yellow-400 text-black",
  };

  return (
    <Link
      to={to}
      className={`p-3 md:p-4 rounded-xl text-center text-white font-medium transition-all hover:scale-105 ${colors[color]}`}
    >
      <span className="text-2xl md:text-3xl block mb-1">{icon}</span>
      <span className="text-xs md:text-sm">{label}</span>
    </Link>
  );
}
