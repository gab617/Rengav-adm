import React, { useState, useEffect } from "react";
import { LiProduct } from "./LiProduct";
import { useAppContext } from "../../../contexto/Context";

export function ProductosCategorizados({ productosPorCategoria }) {
  const { preferencias, updatePreferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [vista, setVista] = useState("mosaico");
  const [tamano, setTamano] = useState("normal");

  useEffect(() => {
    if (preferencias?.view_products) {
      setVista(preferencias.view_products === "list" ? "listado" : "mosaico");
    }
  }, [preferencias]);

  const gridCols =
    vista === "listado"
      ? "grid-cols-1"
      : tamano === "chico"
        ? esMobile
          ? "grid-cols-4"
          : "grid-cols-6"
        : tamano === "grande"
          ? "grid-cols-2 md:grid-cols-3"
          : esMobile
            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-3 md:grid-cols-4";

  return (
    <div
      className={`${
        dark
          ? "bg-gray-900 text-white min-h-screen"
          : "bg-gray-50 text-gray-900 min-h-screen"
      }`}
    >
      <div
        className={`flex items-center gap-2 mb-4 p-2 rounded-lg sticky top-0 z-10 shadow transition-colors ${
          dark ? "bg-gray-800" : "bg-white"
        }`}
      >
        <button
          onClick={() => {
            setVista("mosaico");
            updatePreferencias({ view_products: "mosaic" });
          }}
          className={`p-2 rounded-lg flex items-center gap-1 transition-all ${
            vista === "mosaico"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
              : dark
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <span className="text-lg">🔳</span>
          <span className="hidden sm:inline">Mosaico</span>
        </button>

        <button
          onClick={() => {
            setVista("listado");
            updatePreferencias({ view_products: "list" });
          }}
          className={`p-2 rounded-lg flex items-center gap-1 transition-all ${
            vista === "listado"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
              : dark
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <span className="text-lg">📋</span>
          <span className="hidden sm:inline">Listado</span>
        </button>

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
                className=" text-2xl font-bold mb-1 text-white px-2 py-1 rounded-t-lg"
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
                      <h3 className="px-2 py-1 text-xl font-semibold mb-1">
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
