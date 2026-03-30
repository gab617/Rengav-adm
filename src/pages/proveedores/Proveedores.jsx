import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../contexto/Context";
import { FormProveedor } from "./FormProveedor";
import { ListProveedores } from "./components/ListProveedores";
import { Toast } from "./components/Toast";

export function Proveedores() {
  const { proveedores, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nombre");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-gray-500">⇅</span>;
    return <span className={dark ? "text-blue-400" : "text-blue-600"}>{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${bgMain} pb-24 md:pb-6`}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>
              📜 Proveedores
            </h1>
            <p className={`text-sm ${textSecondary}`}>
              {filteredAndSortedProveedores.length} de {proveedores.length} proveedores
            </p>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
              showForm
                ? dark
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-200 text-gray-700"
                : "bg-blue-600 text-white hover:bg-blue-500 hover:scale-105"
            }`}
          >
            <span className="text-xl">{showForm ? "✕" : "+"}</span>
            <span>{showForm ? "Cerrar" : "Agregar"}</span>
          </button>
        </div>

        {/* FORMULARIO COLAPSABLE */}
        <div
          className={`transition-all duration-500 ease-out overflow-hidden ${
            showForm ? "max-h-[800px] opacity-100 mb-6" : "max-h-0 opacity-0"
          }`}
        >
          <div className={`p-4 md:p-6 rounded-2xl ${bgCard} border ${borderColor} shadow-xl`}>
            <FormProveedor
              onSuccess={(msg) => {
                showToast(msg, "success");
                setShowForm(false);
              }}
              onError={(msg) => showToast(msg, "error")}
            />
          </div>
        </div>

        {/* BÚSQUEDA Y FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* BUSCADOR */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputBg} text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary} hover:text-red-500 transition-colors`}
              >
                ✕
              </button>
            )}
          </div>

          {/* ORDENAMIENTO */}
          <div className={`flex rounded-xl border ${borderColor} overflow-hidden`}>
            <button
              onClick={() => toggleSort("nombre")}
              className={`px-3 py-3 text-sm font-medium transition-all flex items-center gap-1 ${
                sortBy === "nombre"
                  ? dark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : `${inputBg} ${textSecondary} hover:${textPrimary}`
              }`}
            >
              Nombre <SortIcon field="nombre" />
            </button>
            <button
              onClick={() => toggleSort("fecha")}
              className={`px-3 py-3 text-sm font-medium transition-all flex items-center gap-1 border-l ${borderColor} ${
                sortBy === "fecha"
                  ? dark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : `${inputBg} ${textSecondary} hover:${textPrimary}`
              }`}
            >
              Fecha <SortIcon field="fecha" />
            </button>
          </div>
        </div>
      </div>

      {/* LISTA DE PROVEEDORES */}
      <div className="max-w-5xl mx-auto">
        {filteredAndSortedProveedores.length === 0 ? (
          <div className={`text-center py-16 ${bgCard} rounded-2xl border ${borderColor}`}>
            <div className="text-6xl mb-4">{proveedores.length === 0 ? "📦" : "🔍"}</div>
            <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>
              {proveedores.length === 0 ? "Sin proveedores" : "Sin resultados"}
            </h3>
            <p className={textSecondary}>
              {proveedores.length === 0
                ? "Agrega tu primer proveedor para comenzar"
                : `No hay proveedores que coincidan con "${searchTerm}"`}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Limpiar búsqueda
              </button>
            )}
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
