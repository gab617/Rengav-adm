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
            ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
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
        ({ categoria, productosConSubcategoria, productosSinSubcategoria }) => {
          const tieneProductos =
            productosConSubcategoria.some(
              ({ productos }) => productos.length > 0
            ) || productosSinSubcategoria.length > 0;
          if (!tieneProductos) return null;

          const totalProductos =
            productosSinSubcategoria.length +
            productosConSubcategoria.reduce(
              (acc, s) => acc + s.productos.length,
              0
            );

          return (
            <div
              key={categoria.id}
              className="mb-3 overflow-hidden rounded-2xl border transition-colors"
              style={{
                borderColor: dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
                background: `color-mix(in srgb, ${categoria.color} 8%, ${
                  dark ? "#0f172a" : "#ffffff"
                })`,
              }}
            >
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 shadow-sm sm:px-4 sm:py-2.5"
                style={{
                  background: `linear-gradient(100deg, ${categoria.color}, color-mix(in srgb, ${categoria.color} 78%, #000))`,
                }}
              >
                <h2 className="text-lg font-bold tracking-wide text-white sm:text-xl">
                  {categoria.nombre}
                </h2>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {totalProductos} productos
                </span>
              </div>

              <div className="space-y-2 p-2 sm:p-3">
                {/* SIN SUBCATEGORÍA */}
                {productosSinSubcategoria.length > 0 && (
                  <section
                    className={`rounded-xl border p-1.5 sm:p-2 ${
                      dark
                        ? "border-white/10 bg-gray-900/60"
                        : "border-black/5 bg-white/70"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5 px-1.5 pt-0.5">
                      <span
                        className="h-3.5 w-1 shrink-0 rounded-full"
                        style={{ background: categoria.color }}
                      />
                      <h3
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          dark ? "text-gray-200" : "text-gray-600"
                        }`}
                      >
                        Productos sin subcategoría
                      </h3>
                      <span
                        className="ml-auto shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold text-white"
                        style={{ background: categoria.color }}
                      >
                        {productosSinSubcategoria.length}
                      </span>
                    </div>
                    <ul
                      className={`grid ${gridCols} items-start gap-2 ${
                        vista === "listado" ? "divide-y gap-0.5" : ""
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
                  </section>
                )}

                {/* CON SUBCATEGORÍA */}
                {productosConSubcategoria.map(
                  ({ subcategoria, productos }) =>
                    productos.length > 0 && (
                      <section
                        key={subcategoria.id}
                        className={`rounded-xl border p-1.5 sm:p-2 ${
                          dark
                            ? "border-white/10 bg-gray-900/60"
                            : "border-black/5 bg-white/70"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center gap-1.5 px-1.5 pt-0.5">
                          <span
                            className="h-3.5 w-1 shrink-0 rounded-full"
                            style={{ background: categoria.color }}
                          />
                          <h3
                            className={`text-[11px] font-semibold uppercase tracking-wider ${
                              dark ? "text-gray-200" : "text-gray-600"
                            }`}
                          >
                            {subcategoria.nombre}
                          </h3>
                          <span
                            className="ml-auto shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold text-white"
                            style={{ background: categoria.color }}
                          >
                            {productos.length}
                          </span>
                        </div>
                        <ul
                          className={`grid ${gridCols} items-start gap-2 ${
                            vista === "listado" ? "divide-y gap-0.5" : ""
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
                      </section>
                    )
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
