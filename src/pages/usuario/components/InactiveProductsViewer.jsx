import React, { useState, useMemo } from "react";
import { useAppContext } from "../../../contexto/Context";
import { toast } from "react-toastify";
// motion se usa en JSX (<motion.div>) pero sin jsx-uses-vars el
// linter no ve referencias JSX y lo marca "unused". NO BORRAR.
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import {
  IconPackage,
  IconChevronDown,
  IconInfo,
  IconCheck,
  IconPlus,
} from "../../../components/icons";

export function InactiveProductsViewer({ inactiveProducts = [] }) {
  const { preferencias, categorias, reactivarProducto, loadingProductsIndividual } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [open, setOpen] = useState(false);
  const [openCats, setOpenCats] = useState({});

  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";

  const productosPorCategoria = useMemo(() => {
    const grupos = {};

    inactiveProducts.forEach((p) => {
      const catId = p.products_base?.category_id || "0";
      if (!grupos[catId]) grupos[catId] = [];
      grupos[catId].push(p);
    });

    return grupos;
  }, [inactiveProducts]);

  const toggleCat = (catId) => {
    setOpenCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleReactivar = async (id) => {
    const res = await reactivarProducto(id);

    if (res?.reactivado) {
      toast.success("Producto reactivado");
    } else {
      toast.error("Error al reactivar el producto");
    }
  };

  return (
    <div className="w-full">
      {/* BOTÓN PRINCIPAL */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
          dark
            ? "bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-gray-700"
            : "bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <IconPackage className="w-5 h-5 shrink-0" />
          <span className="truncate">Ver productos inactivos</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-500">
            {inactiveProducts.length}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <IconChevronDown className="w-4 h-4" />
          </motion.span>
        </span>
      </button>

      <p className={`text-xs mt-1.5 flex items-center gap-1 ${textSecondary}`}>
        <IconInfo className="w-3.5 h-3.5 shrink-0" />
        Mínimo 1 venta: solo aparecen productos que tuvieron actividad alguna vez.
      </p>

      {/* CONTENIDO */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="inactivos-lista"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={`mt-3 rounded-2xl border ${bgCard} ${borderColor} overflow-hidden`}>
              {inactiveProducts?.length === 0 && (
                <div className={`p-8 text-center ${textSecondary}`}>
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center ${
                    dark ? "bg-gray-700/50 text-green-400" : "bg-green-50 text-green-500"
                  }`}>
                    <IconCheck className="w-7 h-7" />
                  </div>
                  <p>No tienes productos inactivos.</p>
                </div>
              )}

              {Object.entries(productosPorCategoria).map(([catId, productos]) => {
                const catName =
                  categorias.find((c) => c.id === Number(catId))?.nombre || "Sin categoría";
                const isOpen = !!openCats[catId];

                return (
                  <div key={catId} className={`border-b last:border-b-0 ${borderColor}`}>
                    {/* HEADER CATEGORÍA */}
                    <button
                      onClick={() => toggleCat(catId)}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                        dark
                          ? "text-gray-200 hover:bg-gray-700/50"
                          : "text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          dark ? "bg-gray-700 text-yellow-400" : "bg-yellow-100 text-yellow-600"
                        }`}>
                          <IconPackage className="w-4 h-4" />
                        </span>
                        <span className="truncate">{catName}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
                        }`}>
                          {productos.length}
                        </span>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <IconChevronDown className="w-4 h-4" />
                        </motion.span>
                      </span>
                    </button>

                    {/* LISTA */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key={`list-${catId}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <ul className={`${dark ? "bg-gray-900/60" : "bg-gray-50/70"}`}>
                            {productos.map((p) => (
                              <li
                                key={p.id}
                                className={`px-4 py-2.5 flex justify-between items-center gap-3 border-b last:border-b-0 ${
                                  dark ? "border-gray-700" : "border-gray-200"
                                }`}
                              >
                                <span className="text-sm text-left min-w-0 truncate">
                                  {p.products_base?.name || p.descripcion || "Sin nombre"}
                                </span>

                                <button
                                  disabled={loadingProductsIndividual[p.id]}
                                  onClick={() => handleReactivar(p.id)}
                                  className={`px-3 py-1.5 rounded-xl text-sm font-medium text-white flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 shrink-0 ${
                                    loadingProductsIndividual[p.id]
                                      ? "bg-green-400/60 cursor-not-allowed"
                                      : "bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500"
                                  }`}
                                >
                                  {loadingProductsIndividual[p.id] ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                      Reactivando
                                    </>
                                  ) : (
                                    <>
                                      <IconPlus className="w-4 h-4" />
                                      Reactivar
                                    </>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}