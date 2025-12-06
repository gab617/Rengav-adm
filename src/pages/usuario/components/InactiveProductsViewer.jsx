import React, { useState, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import { toast } from "react-toastify";

export function InactiveProductsViewer({ inactiveProducts = [] }) {
  const { preferencias, categories,reactivarProducto,loadingProductsIndividual } = useAppContext();
  const dark = preferencias?.theme === "dark";


  const [open, setOpen] = useState(false);
  const [openCats, setOpenCats] = useState({});

  // 🎨 Estilos dinámicos
  const bgContainer = dark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-900";
  const bgCategory = dark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-300 hover:bg-gray-400";
  const bgList = dark ? "bg-gray-900" : "bg-gray-50";
  const borderColor = dark ? "border-gray-600" : "border-gray-300";
  const textSecondary = dark ? "text-gray-400" : "text-gray-600";

  // 🧩 Agrupar por categoría
  const productosPorCategoria = useMemo(() => {
    const grupos = {};

    inactiveProducts.forEach((p) => {
      const catId = p.products_base?.category_id || "0";
      if (!grupos[catId]) grupos[catId] = [];
      grupos[catId].push(p);
    });

    return grupos;
  }, [inactiveProducts]);

  // 🔄 Reactivar producto
  const handleReactivar = async (id) => {
    const res = await reactivarProducto(id);

    if (res?.reactivado) {
      toast.success("Producto reactivado ✔️");
    } else {
      toast.error("Error al reactivar el producto ❌");
    }
  };

  return (
    <div className="w-full mt-6">
      {/* Botón principal */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition w-full"
      >
        {open
          ? "Ocultar productos inactivos (Minimo 1 venta)"
          : `Ver productos inactivos (Minimo 1 venta) (${inactiveProducts.length})`}
      </button>

      {/* Contenido */}
      {open && (
        <div className={`mt-4 p-4 rounded-lg ${bgContainer}`}>
          <h2 className="text-xl font-bold mb-3">Productos inactivos por categoría</h2>

          {inactiveProducts.length === 0 && (
            <p className={textSecondary}>No tienes productos inactivos.</p>
          )}

          {/* Categorías */}
          {Object.entries(productosPorCategoria).map(([catId, productos]) => {
            const catName =
              categories.find((c) => c.id === Number(catId))?.name || "Sin categoría";

            return (
              <div key={catId} className={`mb-4 border rounded-lg ${borderColor}`}>
                <button
                  onClick={() =>
                    setOpenCats((prev) => ({ ...prev, [catId]: !prev[catId] }))
                  }
                  className={`w-full text-left px-4 py-2 font-semibold transition ${bgCategory}`}
                >
                  Categoría: {catName} — ({productos.length})
                </button>

                {openCats[catId] && (
                  <ul className={`p-3 ${bgList}`}>
                    {productos.map((p) => (
                      <li
                        key={p.id}
                        className={`border-b py-2 flex justify-between items-center ${
                          dark
                            ? "text-gray-200 border-gray-700"
                            : "text-gray-800 border-gray-300"
                        }`}
                      >
                        <span>{p.products_base?.name || p.descripcion || "Sin nombre"}</span>

                        {/* BOTÓN REACTIVAR */}
                        <button
                          disabled={loadingProductsIndividual[p.id]}
                          onClick={() => handleReactivar(p.id)}
                          className={`px-3 py-1 rounded-md text-white text-sm ${
                            loadingProductsIndividual[p.id]
                              ? "bg-green-400 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {loadingProductsIndividual[p.id] ? "..." : "Reactivar"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
