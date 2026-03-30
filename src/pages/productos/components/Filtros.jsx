import React from "react";
import { useAppContext } from "../../../contexto/Context";

export function Filtros({
  filtroNombre,
  setFiltroNombre,
  filtroId,
  setFiltroId,
  filtroMarca,
  setFiltroMarca,
  filtroStock,
  setFiltroStock,
  soloCustom,
  setSoloCustom,
  filtroCategorias,
  toggleCategoria,
  filtroSubcategorias,
  toggleSubcategoria,
  categorias,
  subcategorias,
  marcas,
  onOpenScanner,
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const hayFiltrosActivos =
    filtroNombre || filtroId || filtroMarca || filtroStock || filtroCategorias.length > 0 || soloCustom;

  const resetearTodo = () => {
    setFiltroNombre("");
    setFiltroId("");
    setFiltroMarca("");
    setFiltroStock("");
    setSoloCustom(false);
    filtroCategorias.forEach((cat) => toggleCategoria(cat));
  };

  return (
    <div
      className={`p-3 rounded-2xl shadow-lg border ${
        dark
          ? "bg-gray-800/90 border-gray-700 text-gray-100"
          : "bg-white/90 border-gray-200 text-gray-900"
      }`}
    >
      {/* BUSCADOR PRINCIPAL */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          className={`w-full pl-10 pr-10 py-3 rounded-xl border-2 transition-all text-sm
            ${filtroNombre
              ? dark
                ? "border-blue-500 bg-blue-500/10"
                : "border-blue-500 bg-blue-50"
              : dark
                ? "border-gray-600 bg-gray-700"
                : "border-gray-200 bg-gray-50"
            }
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
        />
        {filtroNombre && (
          <button
            onClick={() => setFiltroNombre("")}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-sm
              ${dark ? "hover:bg-gray-600" : "hover:bg-gray-200"}`}
          >
            ✕
          </button>
        )}
      </div>

      {/* FILTROS RÁPIDOS */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* BUSCAR POR ID */}
        <div className="relative flex gap-1">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs opacity-50">#</span>
            <input
              type="text"
              placeholder="ID"
              value={filtroId}
              onChange={(e) => setFiltroId(e.target.value)}
              className={`w-full pl-7 pr-2 py-2 rounded-lg border text-xs transition-all
                ${filtroId
                  ? dark ? "border-blue-500 bg-blue-500/10" : "border-blue-500 bg-blue-50"
                  : dark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"
                } focus:outline-none focus:border-blue-500`}
            />
          </div>
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all
                ${dark
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-purple-500 hover:bg-purple-600 text-white"
                }
              `}
              title="Escanear código"
            >
              📷
            </button>
          )}
        </div>

        {/* MARCA */}
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs opacity-50">🏷️</span>
          <input
            type="text"
            placeholder="Marca"
            value={filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className={`w-full pl-7 pr-2 py-2 rounded-lg border text-xs transition-all
              ${filtroMarca
                ? dark ? "border-blue-500 bg-blue-500/10" : "border-blue-500 bg-blue-50"
                : dark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"
              } focus:outline-none focus:border-blue-500`}
          />
        </div>

        {/* STOCK BAJO */}
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs opacity-50">⚠️</span>
          <input
            type="number"
            placeholder="Stock ≤"
            value={filtroStock}
            onChange={(e) => setFiltroStock(e.target.value)}
            className={`w-full pl-7 pr-2 py-2 rounded-lg border text-xs transition-all
              ${filtroStock
                ? dark ? "border-orange-500 bg-orange-500/10" : "border-orange-500 bg-orange-50"
                : dark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"
              } focus:outline-none focus:border-orange-500`}
          />
        </div>
      </div>

      {/* TIPO DE PRODUCTO */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSoloCustom(false)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2
            ${!soloCustom
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : dark
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
        >
          <span>📦</span>
          <span>Todos</span>
        </button>

        <button
          onClick={() => setSoloCustom(true)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2
            ${soloCustom
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : dark
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
        >
          <span>✨</span>
          <span>Personalizados</span>
        </button>
      </div>

      {/* CATEGORÍAS */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Categorías
          </span>
          {filtroCategorias.length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {filtroCategorias.length} activa{filtroCategorias.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {categorias.map((cat) => {
            const activa = filtroCategorias.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategoria(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5
                  ${activa
                    ? "text-white shadow-md"
                    : dark
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                style={activa ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activa ? "white" : cat.color }}
                />
                {cat.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBCATEGORÍAS */}
      {filtroCategorias.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Subcategorías
            </span>
            {filtroSubcategorias.length > 0 && (
              <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                {filtroSubcategorias.length} activa{filtroSubcategorias.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {subcategorias
              .filter((s) => filtroCategorias.includes(s.id_categoria))
              .map((sub) => {
                const activa = filtroSubcategorias.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    onClick={() => toggleSubcategoria(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${activa
                        ? "bg-emerald-600 text-white shadow-md"
                        : dark
                          ? "bg-gray-700/50 hover:bg-gray-600 text-gray-400"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                  >
                    {sub.nombre}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* RESETEAR */}
      {hayFiltrosActivos && (
        <button
          onClick={resetearTodo}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2
            ${dark
              ? "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30"
              : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
            }`}
        >
          <span>🔄</span>
          <span>Resetear filtros</span>
        </button>
      )}
    </div>
  );
}
