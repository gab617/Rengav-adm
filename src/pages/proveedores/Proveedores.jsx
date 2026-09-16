import { useState, useMemo } from "react";
// motion se usa en JSX (<motion.div>) pero sin jsx-uses-vars el
// linter no ve referencias JSX y lo marca "unused". NO BORRAR.
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { useAppContext } from "../../contexto/Context";
import { FormProveedor } from "./FormProveedor";
import { ListProveedores } from "./components/ListProveedores";
import { Toast } from "./components/Toast";
import {
  IconArrowDown,
  IconArrowUp,
  IconBuilding,
  IconClose,
  IconPlus,
  IconSearch,
  IconSort,
} from "../../components/icons";

export function Proveedores() {
  const { proveedores, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nombre");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const filteredAndSortedProveedores = useMemo(() => {
    let result = [...proveedores];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(term) ||
          p.email?.toLowerCase().includes(term) ||
          p.telefono?.includes(term)
      );
    }

    result.sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case "nombre":
          valA = a.nombre?.toLowerCase() || "";
          valB = b.nombre?.toLowerCase() || "";
          break;
        case "fecha":
          valA = new Date(a.fecha_registro || 0).getTime();
          valB = new Date(b.fecha_registro || 0).getTime();
          break;
        case "telefono":
          valA = a.telefono || "";
          valB = b.telefono || "";
          break;
        default:
          valA = a.nombre || "";
          valB = b.nombre || "";
      }

      if (sortOrder === "asc") {
        return valA < valB ? -1 : valA > valB ? 1 : 0;
      } else {
        return valA > valB ? -1 : valA < valB ? 1 : 0;
      }
    });

    return result;
  }, [proveedores, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800" : "bg-white";
  const bgMain = dark ? "bg-gray-900" : "bg-gray-50";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";
  const inputBg = dark ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300";

  const total = proveedores.length;
  const filtered = filteredAndSortedProveedores.length;

  const SortIcon = ({ field }) => {
    const size = "w-3.5 h-3.5";
    if (sortBy === field) {
      return sortOrder === "asc" ? (
        <IconArrowUp className={size} />
      ) : (
        <IconArrowDown className={size} />
      );
    }
    return <IconSort className={`${size} opacity-50`} />;
  };

  const sortBtn = (field) => `px-3 py-3 text-sm font-medium transition-all flex items-center gap-1.5 ${
    sortBy === field
      ? dark
        ? "bg-blue-600 text-white"
        : "bg-blue-500 text-white"
      : `${inputBg} ${textSecondary}`
  } ${sortBy !== field ? "hover:opacity-80" : ""}`;

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${bgMain} pb-24 md:pb-6`}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold flex items-center gap-3 ${textPrimary}`}>
              <span
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white ${
                  dark
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-900/40"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                }`}
              >
                <IconBuilding className="w-6 h-6" />
              </span>
              Proveedores
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  dark ? "bg-gray-800 text-gray-300" : "bg-blue-50 text-blue-600"
                }`}
              >
                {filtered} de {total}
              </span>
              <span className={`text-sm ${textSecondary}`}>proveedores</span>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
              showForm
                ? dark
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-200 text-gray-700"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:scale-105 shadow-blue-500/25 hover:shadow-blue-500/40"
            }`}
          >
            {showForm ? (
              <>
                <IconClose className="w-5 h-5" />
                <span>Cerrar</span>
              </>
            ) : (
              <>
                <IconPlus className="w-5 h-5" />
                <span>Agregar</span>
              </>
            )}
          </button>
        </div>

        {/* FORMULARIO COLAPSABLE */}
        <AnimatePresence initial={false}>
          {showForm && (
            <motion.div
              key="form-proveedor"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className={`p-4 md:p-6 rounded-2xl ${bgCard} border ${borderColor} shadow-xl mb-6`}>
                <FormProveedor
                  onSuccess={(msg) => {
                    showToast(msg, "success");
                    setShowForm(false);
                  }}
                  onError={(msg) => showToast(msg, "error")}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BÚSQUEDA Y FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* BUSCADOR */}
          <div className="relative flex-1">
            <IconSearch
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                dark ? "text-gray-400" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-10 py-3 rounded-xl border ${inputBg} text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
                  dark
                    ? "text-gray-400 hover:text-red-400 hover:bg-gray-600/60"
                    : "text-gray-400 hover:text-red-500 hover:bg-gray-100"
                }`}
              >
                <IconClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ORDENAMIENTO */}
          <div className={`flex rounded-xl border ${borderColor} overflow-hidden`}>
            <button
              onClick={() => toggleSort("nombre")}
              className={`${sortBtn("nombre")} ${
                sortBy === "nombre" ? "" : `border-r ${borderColor}`
              }`}
            >
              Nombre <SortIcon field="nombre" />
            </button>
            <button onClick={() => toggleSort("fecha")} className={sortBtn("fecha")}>
              Fecha <SortIcon field="fecha" />
            </button>
          </div>
        </div>
      </div>

      {/* LISTA DE PROVEEDORES */}
      <div className="max-w-5xl mx-auto">
        {filtered === 0 ? (
          <div className={`text-center py-16 rounded-3xl ${bgCard} border ${borderColor} relative overflow-hidden`}>
            <div
              className={`absolute inset-0 pointer-events-none ${
                dark
                  ? "bg-gradient-to-b from-blue-900/10 to-transparent"
                  : "bg-gradient-to-b from-blue-50 to-transparent"
              }`}
            />
            <div className="relative">
              <span
                className={`mx-auto mb-5 w-20 h-20 rounded-3xl flex items-center justify-center ${
                  dark
                    ? "bg-gradient-to-br from-blue-600/30 to-indigo-600/20 text-blue-400 border border-blue-700/40"
                    : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-500 border border-blue-200"
                }`}
              >
                {total === 0 ? (
                  <IconBuilding className="w-10 h-10" />
                ) : (
                  <IconSearch className="w-10 h-10" />
                )}
              </span>
              <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>
                {total === 0 ? "Sin proveedores" : "Sin resultados"}
              </h3>
              <p className={textSecondary}>
                {total === 0
                  ? "Agregá tu primer proveedor para comenzar"
                  : `No hay proveedores que coincidan con "${searchTerm}"`}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
        ) : (
          <ListProveedores
            proveedores={filteredAndSortedProveedores}
            onShowToast={showToast}
          />
        )}
      </div>
    </div>
  );
}