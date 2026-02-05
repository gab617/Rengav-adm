import React, { useState, useEffect } from "react";
import { LiProduct } from "./LiProduct";
import { useAppContext } from "../../../contexto/Context";

export function ProductosCategorizados({ productosPorCategoria }) {
  const { preferencias, updatePreferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  // Detectar mobile (simple y efectivo)
  const esMobile = window.innerWidth < 768;

  // Vista inicial
  const [vista, setVista] = useState("listado");
  const [tamano, setTamano] = useState("normal");

  // Sincronizar vista según preferencias / mobile
  useEffect(() => {
    if (esMobile) {
      setVista("listado");
    } else if (preferencias?.view_products) {
      setVista(preferencias.view_products === "list" ? "listado" : "mosaico");
    }
  }, [preferencias]);

  // Grid dinámico
  const gridCols =
    vista === "listado"
      ? "grid-cols-1"
      : tamano === "chico"
      ? "grid-cols-6"
      : tamano === "grande"
      ? "grid-cols-3"
      : "grid-cols-4";

  return (
    <div
      className={`${
        dark
          ? "bg-gray-900 text-white min-h-screen"
          : "bg-gray-50 text-gray-900 min-h-screen"
      }`}
    >
      {/* === BOTONERA === */}
      <div
        className={`flex items-center gap-2 mb-4 p-2 rounded-lg sticky top-0 z-10 shadow transition-colors ${
          dark ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* LISTADO (siempre disponible) */}
        <button
          onClick={() => {
            setVista("listado");
            updatePreferencias({ view_products: "list" });
          }}
          className={`p-2 rounded-lg flex items-center gap-1 transition-colors ${
            vista === "listado"
              ? "bg-blue-500 text-white"
              : dark
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          📋 Listado
        </button>

        {/* MOSAICO (solo tablet / desktop) */}
        {!esMobile && (
          <button
            onClick={() => {
              setVista("mosaico");
              updatePreferencias({ view_products: "mosaic" });
            }}
            className={`p-2 rounded-lg flex items-center gap-1 transition-colors ${
              vista === "mosaico"
                ? "bg-blue-500 text-white"
                : dark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🔳 Mosaico
          </button>
        )}

        {/* Tamaños (no mobile) */}
        {!esMobile && vista === "mosaico" && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() =>
                setTamano((prev) =>
                  prev === "grande"
                    ? "normal"
                    : prev === "normal"
                    ? "chico"
                    : "chico"
                )
              }
              className={`p-2 rounded-lg transition-colors ${
                dark
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              ➖
            </button>

            <button
              onClick={() =>
                setTamano((prev) =>
                  prev === "chico"
                    ? "normal"
                    : prev === "normal"
                    ? "grande"
                    : "grande"
                )
              }
              className={`p-2 rounded-lg transition-colors ${
                dark
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              ➕
            </button>
          </div>
        )}
      </div>

      {/* === CONTENIDO === */}
      {productosPorCategoria.map(
        ({ categoria, productosConSubcategoria, productosSinSubcategoria }) =>
          (productosConSubcategoria.some(
            ({ productos }) => productos.length > 0
          ) ||
            productosSinSubcategoria.length > 0) && (
            <div
              key={categoria.id}
              className="mb-3 p-1 rounded-xl transition-colors"
              style={{ background: categoria.color }}
            >
              <h2
                className="text-2xl font-bold mb-1 text-white px-2 py-1 rounded-t-lg"
                style={{ background: categoria.color }}
              >
                {categoria.nombre}
              </h2>

              {/* SIN SUBCATEGORÍA */}
              {productosSinSubcategoria.length > 0 && (
                <div
                  className={`shadow-md rounded-lg p-4 mb-2 transition-colors ${
                    dark
                      ? "bg-gray-800/90 text-white"
                      : "bg-white/85 text-gray-900"
                  }`}
                >
                  <h3 className="text-xl font-semibold mb-1">
                    Productos sin subcategoría
                  </h3>
                  <ul
                    className={`grid ${gridCols} gap-2 ${
                      vista === "listado" ? "divide-y" : ""
                    }`}
                  >
                    {productosSinSubcategoria.map((prod) => (
                      <LiProduct
                        key={prod.id_producto}
                        prod={prod}
                        color={categoria.color}
                        vista={vista}
                        tamano={tamano}
                        dark={dark}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* CON SUBCATEGORÍA */}
              {productosConSubcategoria.map(
                ({ subcategoria, productos }) =>
                  productos.length > 0 && (
                    <div
                      key={subcategoria.id}
                      className={`shadow-md rounded-lg p-[.3.em] md:p-4 mb-2 transition-colors ${
                        dark
                          ? "bg-gray-800/90 text-white"
                          : "bg-white/85 text-gray-900"
                      }`}
                    >
                      <h3 className="text-xl font-semibold mb-1">
                        {subcategoria.nombre}
                      </h3>
                      <ul
                        className={`grid ${gridCols} gap-2 ${
                          vista === "listado" ? "divide-y" : ""
                        }`}
                      >
                        {productos.map((prod) => (
                          <LiProduct
                            key={prod.id_producto}
                            prod={prod}
                            color={categoria.color}
                            vista={vista}
                            tamano={tamano}
                            dark={dark}
                          />
                        ))}
                      </ul>
                    </div>
                  )
              )}
            </div>
          )
      )}
    </div>
  );
}
