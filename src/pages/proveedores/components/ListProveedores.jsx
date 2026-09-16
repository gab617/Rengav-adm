import { useState } from "react";
// motion se usa en JSX (<motion.div>) pero sin jsx-uses-vars el
// linter no ve referencias JSX y lo marca "unused". NO BORRAR.
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useAppContext } from "../../../contexto/Context";
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconEdit,
  IconMail,
  IconMapPin,
  IconPhone,
  IconTrash,
  IconWarning,
} from "../../../components/icons";

const AVATAR_COLORS = [
  ["from-blue-500", "to-indigo-600"],
  ["from-emerald-500", "to-teal-600"],
  ["from-amber-500", "to-orange-600"],
  ["from-purple-500", "to-fuchsia-600"],
  ["from-rose-500", "to-pink-600"],
  ["from-cyan-500", "to-sky-600"],
];

function getAvatarColor(name) {
  let hash = 0;
  for (const ch of name || "") hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className={`p-6 rounded-2xl shadow-2xl max-w-sm w-full border ${
          dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="text-center mb-5">
          <span
            className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center ${
              dark
                ? "bg-red-500/15 text-red-400"
                : "bg-red-50 text-red-500"
            }`}
          >
            <IconWarning className="w-7 h-7" />
          </span>
          <p className={`text-lg font-medium ${dark ? "text-white" : "text-gray-900"}`}>
            {message}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              dark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <IconClose className="w-4 h-4" />
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2"
          >
            <IconTrash className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ListProveedores({ proveedores, onShowToast }) {
  const { eliminarProveedor, actualizarProveedor, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [expandedDesc, setExpandedDesc] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const labelText = dark ? "text-gray-300" : "text-gray-600";

  const handleEdit = (proveedor) => {
    setEditingId(proveedor.id);
    setEditData({ ...proveedor });
  };

  const handleChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await actualizarProveedor(editingId, editData);
      setEditingId(null);
      onShowToast("Proveedor actualizado", "success");
    } catch {
      onShowToast("Error al actualizar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await eliminarProveedor(id);
      setConfirmDelete(null);
      onShowToast("Proveedor eliminado", "success");
    } catch {
      onShowToast("Error al eliminar", "error");
    } finally {
      setDeleting(null);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const hasWhatsApp = (telefono) => {
    if (!telefono) return false;
    const clean = telefono.replace(/\D/g, "");
    return clean.length >= 6;
  };

  const getWhatsAppUrl = (telefono) => {
    const clean = telefono.replace(/\D/g, "");
    const number = clean.startsWith("549") ? clean : `549${clean}`;
    return `https://wa.me/${number}`;
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message="¿Eliminar este proveedor? Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="space-y-3">
        {proveedores.map((proveedor, index) => {
          const isEditing = editingId === proveedor.id;
          const isDeleting = deleting === proveedor.id;
          const isExpanded = expandedDesc === proveedor.id;
          const isCopied = copiedId === proveedor.id;

          return (
            <motion.div
              key={proveedor.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.25, ease: "easeOut" }}
              className={`${bgCard} rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${
                isDeleting ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {isEditing ? (
                <EditableView
                  data={editData}
                  onChange={handleChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  saving={saving}
                  inputBg={inputBg}
                  labelText={labelText}
                  dark={dark}
                />
              ) : (
                <NormalView
                  proveedor={proveedor}
                  isExpanded={isExpanded}
                  isCopied={isCopied}
                  onToggleDesc={() =>
                    setExpandedDesc(isExpanded ? null : proveedor.id)
                  }
                  onEdit={() => handleEdit(proveedor)}
                  onDelete={() => setConfirmDelete(proveedor.id)}
                  onCopyPhone={copyToClipboard}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  dark={dark}
                  hasWhatsApp={hasWhatsApp}
                  getWhatsAppUrl={getWhatsAppUrl}
                  formatDate={formatDate}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

function NormalView({
  proveedor,
  isExpanded,
  isCopied,
  onToggleDesc,
  onEdit,
  onDelete,
  onCopyPhone,
  textPrimary,
  textSecondary,
  dark,
  hasWhatsApp,
  getWhatsAppUrl,
  formatDate,
}) {
  const [c1, c2] = getAvatarColor(proveedor.nombre);

  const ghostBtn = (colorClasses, focusRing) =>
    `p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 focus-visible:ring-2 ${focusRing} focus-visible:outline-none ${colorClasses}`;

  const editBtn = dark
    ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 focus-visible:ring-blue-400/60"
    : "bg-blue-50 text-blue-600 hover:bg-blue-100 focus-visible:ring-blue-300";
  const deleteBtn = dark
    ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 focus-visible:ring-red-400/60"
    : "bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-300";

  const icon = "w-[1.1em] h-[1.1em]";
  const rowText = dark ? "text-gray-200" : "text-gray-700";

  return (
    <div className="p-4 md:p-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br ${c1} ${c2} text-white flex items-center justify-center text-lg font-bold shadow-md`}
          >
            {getInitials(proveedor.nombre)}
          </span>
          <div className="min-w-0">
            <h3 className={`text-base md:text-lg font-bold truncate ${textPrimary}`}>
              {proveedor.nombre}
            </h3>
            <p className={`text-xs flex items-center gap-1.5 mt-1 ${textSecondary}`}>
              <IconCalendar className={icon} />
              Registrado: {formatDate(proveedor.fecha_registro)}
            </p>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} title="Editar" aria-label="Editar proveedor" className={ghostBtn(editBtn, "ring-blue-400")}>
            <IconEdit className="w-4.5 h-4.5" />
          </button>
          <button onClick={onDelete} title="Eliminar" aria-label="Eliminar proveedor" className={ghostBtn(deleteBtn, "ring-red-400")}>
            <IconTrash className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* INFO */}
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${dark ? "bg-gray-700/60 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            <IconPhone className="w-3.5 h-3.5" />
          </span>
          <button
            onClick={() => onCopyPhone(proveedor.telefono, proveedor.id)}
            className={`text-sm ${rowText} hover:underline flex items-center gap-1 truncate min-w-0`}
            title="Copiar teléfono"
          >
            <span className="truncate">{proveedor.telefono || "-"}</span>
            {isCopied && (
              <IconCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${dark ? "bg-gray-700/60 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            <IconMail className="w-3.5 h-3.5" />
          </span>
          <a
            href={`mailto:${proveedor.email}`}
            className={`text-sm ${dark ? "text-blue-400" : "text-blue-600"} hover:underline truncate min-w-0`}
          >
            {proveedor.email || "-"}
          </a>
        </div>

        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${dark ? "bg-gray-700/60 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            <IconMapPin className="w-3.5 h-3.5" />
          </span>
          <span className={`text-sm ${textSecondary} truncate min-w-0`}>
            {proveedor.direccion || "Sin dirección"}
          </span>
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      {proveedor.descripcion && (
        <div
          className={`mt-4 p-3 rounded-xl border ${
            dark ? "bg-gray-700/40 border-gray-700" : "bg-gray-50 border-gray-100"
          } cursor-pointer transition-colors`}
          onClick={onToggleDesc}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${textSecondary}`}>
              Descripción
            </span>
            <span className={textSecondary}>
              <IconChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </span>
          </div>
          <p
            className={`text-sm ${textPrimary} ${
              isExpanded ? "" : "line-clamp-2"
            }`}
          >
            {proveedor.descripcion}
          </p>
        </div>
      )}

      {/* WHATSAPP */}
      {hasWhatsApp(proveedor.telefono) && (
        <div className="mt-4 pt-4 border-t border-inherit">
          <a
            href={getWhatsAppUrl(proveedor.telefono)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all hover:scale-[1.02] shadow-md shadow-green-500/20"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Contactar por WhatsApp</span>
          </a>
        </div>
      )}
    </div>
  );
}

function EditableView({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
  inputBg,
  labelText,
  dark,
}) {
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const [c1, c2] = getAvatarColor(data.nombre);

  const fields = [
    { name: "nombre", label: "Nombre", type: "text", required: true },
    { name: "telefono", label: "Teléfono", type: "tel" },
    { name: "email", label: "Email", type: "email" },
    { name: "direccion", label: "Dirección", type: "text" },
  ];

  return (
    <div className={`p-4 md:p-5 ${dark ? "bg-gray-700/30" : "bg-gray-50"} rounded-2xl`}>
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br ${c1} ${c2} text-white flex items-center justify-center text-base font-bold shadow-md`}
        >
          {getInitials(data.nombre)}
        </span>
        <div>
          <h3 className={`text-lg font-bold ${textPrimary}`}>Editar proveedor</h3>
          <p className={`text-xs ${labelText}`}>Actualizá la información</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className={`block text-sm font-medium mb-1 ${labelText}`}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              value={data[field.name] || ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={`w-full p-2.5 rounded-xl border ${inputBg} text-sm focus:ring-2 focus:ring-blue-500 transition-all`}
              required={field.required}
            />
          </div>
        ))}

        <div>
          <label className={`block text-sm font-medium mb-1 ${labelText}`}>
            Descripción
          </label>
          <textarea
            value={data.descripcion || ""}
            onChange={(e) => onChange("descripcion", e.target.value)}
            rows={3}
            className={`w-full p-2.5 rounded-xl border ${inputBg} text-sm focus:ring-2 focus:ring-blue-500 resize-none transition-all`}
            placeholder="Notas adicionales sobre el proveedor..."
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <IconCheck className="w-4 h-4" />
              <span>Guardar</span>
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
            dark
              ? "bg-gray-600 text-gray-200 hover:bg-gray-500"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          } disabled:opacity-50`}
        >
          <IconClose className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
}