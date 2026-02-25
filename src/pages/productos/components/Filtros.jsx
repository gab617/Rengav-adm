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
}) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const esMobile = window.innerWidth < 768;

  return (
    <div
      className={`p-1 sm:w-[70%] sm:mx-auto rounded-2xl shadow-lg border flex flex-col gap-2 text-sm ${
        dark
          ? "bg-gray-800/80 border-gray-700 text-gray-100"
          : "bg-white/80 border-gray-200 text-gray-900"
      }`}
    >
      {/* 🔍 BUSCADOR */}
      <div
        className={`flex gap-2`}
      >
        
        <input
          type="text"
          placeholder="🔍Buscar producto..."
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
           className={`flex-1 px-3 py-2 rounded-xl border ${
            dark
              ? "bg-gray-700 border-gray-600"
              : "bg-gray-50 border-gray-200"
          }`}
        />
        

        <input
          type="text"
          placeholder="🔍Buscar ID..."
          value={filtroId}
          onChange={(e) => setFiltroId(e.target.value)}
                    className={`w-28 px-3 py-2 rounded-xl border ${
            dark
              ? "bg-gray-700 border-gray-600"
              : "bg-gray-50 border-gray-200"
          }`}
        />
      </div>

      {/* MARCA + STOCK */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Marca..."
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
          className={`flex-1 px-3 py-2 rounded-xl border ${
            dark
              ? "bg-gray-700 border-gray-600"
              : "bg-gray-50 border-gray-200"
          }`}
        />

        <input
          type="number"
          placeholder="Stock ≤"
          value={filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
          className={`w-28 px-3 py-2 rounded-xl border ${
            dark
              ? "bg-gray-700 border-gray-600"
              : "bg-gray-50 border-gray-200"
          }`}
        />
      </div>

      {/* SELECT MARCAS */}
      <select
        value={filtroMarca}
        onChange={(e) => setFiltroMarca(e.target.value)}
        className={`px-3 py-2 rounded-xl border ${
          dark
            ? "bg-gray-700 border-gray-600"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <option value="">Todas las marcas</option>
        {marcas?.map((marca) => (
          <option key={marca} value={marca}>
            {marca}
          </option>
        ))}
      </select>

      {/* TIPO */}
      <div className="flex gap-2">
        <button
          onClick={() => setSoloCustom(false)}
          className={`flex-1 py-2 rounded-xl text-sm ${
            !soloCustom
              ? "bg-blue-600 text-white"
              : dark
              ? "bg-gray-700"
              : "bg-gray-200"
          }`}
        >
          Todos
        </button>

        <button
          onClick={() => setSoloCustom(true)}
          className={`flex-1 py-2 rounded-xl text-sm ${
            soloCustom
              ? "bg-emerald-600 text-white"
              : dark
              ? "bg-gray-700"
              : "bg-gray-200"
          }`}
        >
          Personalizados
        </button>
      </div>

      {/* CATEGORÍAS */}
      <div className="flex flex-col gap-2">
        <span className="font-semibold">Categorías</span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategoria(cat.id)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                filtroCategorias.includes(cat.id)
                  ? "bg-blue-600 text-white"
                  : dark
                  ? "bg-gray-700"
                  : "bg-gray-200"
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* SUBCATEGORÍAS */}
      {filtroCategorias.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Subcategorías</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {subcategorias
              .filter((s) => filtroCategorias.includes(s.id_categoria))
              .map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => toggleSubcategoria(sub.id)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                    filtroSubcategorias.includes(sub.id)
                      ? "bg-emerald-600 text-white"
                      : dark
                      ? "bg-gray-700"
                      : "bg-gray-200"
                  }`}
                >
                  {sub.nombre}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
