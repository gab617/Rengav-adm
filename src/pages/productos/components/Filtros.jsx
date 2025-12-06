import React from "react";
import { useAppContext } from "../../../contexto/Context";

export function Filtros({
  filtroNombre,
  setFiltroNombre,
  filtroStock,
  setFiltroStock,
  filtroCategorias,
  toggleCategoria,
  filtroSubcategorias,
  toggleSubcategoria,
  categorias,
  subcategorias,
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  return (
    <div
      className={`p-4 rounded-2xl shadow-lg border flex flex-col gap-4 text-sm transition-all duration-300 ${
        dark
          ? "bg-gray-800/80 border-gray-700 text-gray-100 backdrop-blur-md"
          : "bg-white/80 border-gray-200 text-gray-900 backdrop-blur-md"
      }`}
    >
      {/* 🔍 Búsqueda y stock */}
      <div className="flex gap-3 w-[50%]">
        <div
          className={`flex items-center gap-2 flex-1 rounded-lg px-3 py-2 border transition focus-within:ring-2 ${
            dark
              ? "bg-gray-700 border-gray-600 focus-within:ring-blue-400"
              : "bg-gray-50 border-gray-200 focus-within:ring-blue-400"
          }`}
        >
          <span className={dark ? "text-gray-400" : "text-gray-400"}>🔍</span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className={`bg-transparent flex-1 outline-none placeholder-gray-400 ${
              dark ? "text-gray-100" : "text-gray-800"
            }`}
          />
        </div>

        <div
          className={`w-[50%] flex items-center gap-2 rounded-lg px-3 py-2 border transition focus-within:ring-2 ${
            dark
              ? "bg-gray-700 border-gray-600 focus-within:ring-blue-400"
              : "bg-gray-50 border-gray-200 focus-within:ring-blue-400"
          }`}
        >
          <span className={dark ? "text-gray-400" : "text-gray-400"}>📦</span>
          <input
            type="number"
            placeholder="Stock ≤ "
            value={filtroStock}
            onChange={(e) => setFiltroStock(e.target.value)}
            className={`bg-transparent w-full outline-none placeholder-gray-400 ${
              dark ? "text-gray-100" : "text-gray-800"
            }`}
          />
        </div>
      </div>

      {/* 🗂 Categorías */}
      <div className="flex gap-2">
        <h3 className={`font-semibold flex items-center gap-2 ${dark ? "text-gray-100" : "text-gray-700"}`}>
          🗂 Categorías
        </h3>
        <div className="flex flex-wrap gap-2">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategoria(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all duration-200 ${
                filtroCategorias.includes(cat.id)
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-500 scale-105"
                  : dark
                  ? "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:scale-[1.02]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:scale-[1.02]"
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* 🏷 Subcategorías */}
      <div className="flex">
        <h3 className={`font-semibold flex items-center gap-2 ${dark ? "text-gray-100" : "text-gray-700"}`}>
          🏷 Subcategorías
        </h3>
        <div className="flex flex-wrap gap-2">
          {subcategorias
            .filter((s) => filtroCategorias.includes(s.id_categoria))
            .map((sub) => (
              <button
                key={sub.id}
                onClick={() => toggleSubcategoria(sub.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all duration-200 ${
                  filtroSubcategorias.includes(sub.id)
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-500 scale-105"
                    : dark
                    ? "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:scale-[1.02]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:scale-[1.02]"
                }`}
              >
                {sub.nombre}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
