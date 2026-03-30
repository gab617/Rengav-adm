import React, { useState, useMemo, useRef, useEffect } from "react";
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
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-gray-50 text-gray-900 border-gray-300";

  const [marcaSearch, setMarcaSearch] = useState("");
  const [showMarcaDropdown, setShowMarcaDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMarcaDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marcasFiltradas = useMemo(() => {
    if (!marcas) return [];
    if (!marcaSearch.trim()) return marcas;
    const search = marcaSearch.toLowerCase();
    return marcas.filter(m => m.label.toLowerCase().includes(search));
  }, [marcas, marcaSearch]);

  const hayFiltrosActivos =
    filtroNombre || filtroId || filtroMarca || filtroStock || filtroCategorias.length > 0 || soloCustom || filtroSubcategorias.length > 0;

  const resetearTodo = () => {
    setFiltroNombre("");
    setFiltroId("");
    setFiltroMarca("");
    setFiltroStock("");
    setSoloCustom(false);
    setMarcaSearch("");
    filtroCategorias.forEach((cat) => toggleCategoria(cat));
  };

  const selectMarca = (marca) => {
    setFiltroMarca(marca);
    setMarcaSearch("");
    setShowMarcaDropdown(false);
  };

  return (
    <div
      className={`rounded-2xl shadow-lg border overflow-hidden ${
        dark
          ? "bg-gray-800/90 border-gray-700 text-gray-100"
          : "bg-white/90 border-gray-200 text-gray-900"
      }`}
    >
      {/* BUSCADOR PRINCIPAL */}
      <div className="p-3 pb-0">
        <div className="relative">
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
      </div>

      {/* FILTRO MARCA CON BUSCADOR */}
      {marcas && marcas.length > 0 && (
        <div className="p-3 pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>🏷️ MARCA</span>
            {filtroMarca && (
              <button onClick={() => setFiltroMarca("")} className="text-xs text-blue-500 hover:underline">
                ✕ Limpiar
              </button>
            )}
          </div>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              placeholder={filtroMarca || "Escribí para buscar marca..."}
              value={marcaSearch}
              onChange={(e) => {
                setMarcaSearch(e.target.value);
                setShowMarcaDropdown(true);
              }}
              onFocus={() => setShowMarcaDropdown(true)}
              className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                filtroMarca
                  ? dark ? "border-blue-500 bg-blue-500/20" : "border-blue-500 bg-blue-50"
                  : dark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"
              } focus:outline-none`}
            />
            
            {/* DROPDOWN DE MARCAS */}
            {showMarcaDropdown && (
              <div className={`absolute z-50 w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${
                dark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
              }`}>
                {marcasFiltradas.length === 0 ? (
                  <div className={`px-3 py-2 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    No hay marcas que coincidan
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => selectMarca("")}
                      className={`w-full px-3 py-2 text-left text-xs font-medium border-b ${
                        dark ? "border-gray-600 text-gray-400 hover:bg-gray-600" : "border-gray-100 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      Todas las marcas
                    </button>
                    {marcasFiltradas.map((m) => (
                      <button
                        key={m.key || m.label}
                        onClick={() => selectMarca(m.label)}
                        className={`w-full px-3 py-2 text-left text-sm flex justify-between items-center ${
                          filtroMarca === m.label
                            ? dark ? "bg-blue-500/30 text-blue-400" : "bg-blue-50 text-blue-600"
                            : dark ? "hover:bg-gray-600 text-gray-200" : "hover:bg-gray-50 text-gray-900"
                        }`}
                      >
                        <span>{m.label}</span>
                        <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-400"}`}>{m.count}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* MARCA SELECCIONADA */}
          {filtroMarca && (
            <div className={`mt-2 px-2 py-1 rounded-lg inline-flex items-center gap-1 text-xs ${
              dark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"
            }`}>
              <span>🏷️ {filtroMarca}</span>
            </div>
          )}


        </div>
      )}

      {/* CONTENEDOR SCROLL HORIZONTAL */}
      <div className="px-3 overflow-x-auto -mx-3">
        {/* CATEGORÍAS */}
        <div className="mb-2 py-2 border-t border-gray-700/50">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>📁 CATEGORÍAS</span>
            {filtroCategorias.length > 0 && (
              <button onClick={() => filtroCategorias.forEach(cat => toggleCategoria(cat))} className="text-xs text-purple-500 hover:underline">
                Limpiar
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {categorias.map((cat) => {
              const activa = filtroCategorias.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategoria(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                    activa
                      ? "text-white"
                      : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                  }`}
                  style={activa ? { backgroundColor: cat.color } : {}}
                >
                  {cat.nombre}
                </button>
              );
            })}
          </div>
        </div>

        {/* SUBCATEGORÍAS */}
        {filtroCategorias.length > 0 && (
          <div className="mb-2 py-2 border-t border-gray-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>📂 SUBCATEGORÍAS</span>
              {filtroSubcategorias.length > 0 && (
                <button onClick={() => filtroSubcategorias.forEach(sub => toggleSubcategoria(sub))} className="text-xs text-green-500 hover:underline">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              {subcategorias
                .filter((s) => filtroCategorias.includes(s.id_categoria))
                .map((sub) => {
                  const activa = filtroSubcategorias.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => toggleSubcategoria(sub.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                        activa
                          ? "bg-green-500 text-white"
                          : dark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600"
                      }`}
                    >
                      {sub.nombre}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* FILTROS RÁPIDOS */}
      <div className="p-3 pt-0">
        <div className="grid grid-cols-3 gap-2">
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

          {/* TIPO */}
          <button
            onClick={() => setSoloCustom(!soloCustom)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1
              ${soloCustom
                ? "bg-emerald-600 text-white"
                : dark ? "border border-gray-600 bg-gray-700 text-gray-300" : "border border-gray-200 bg-gray-50 text-gray-600"
              }`}
          >
            ✨ {soloCustom ? "Personalizados" : "Todos"}
          </button>
        </div>

        {/* RESETEAR */}
        {hayFiltrosActivos && (
          <button
            onClick={resetearTodo}
            className={`w-full mt-2 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2
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
    </div>
  );
}
