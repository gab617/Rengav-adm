import { useState } from "react";

const ROLE_META = {
  super_admin: {
    label: "Super admin",
    cls: "bg-violet-100 text-violet-700 ring-violet-200",
  },
  admin: {
    label: "Administrador",
    cls: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  user: {
    label: "Sucursal",
    cls: "bg-blue-100 text-blue-700 ring-blue-200",
  },
};

function roleMeta(role) {
  return (
    ROLE_META[role] || {
      label: (role || "").replace(/[_-]/g, " ") || "Usuario",
      cls: "bg-gray-100 text-gray-600 ring-gray-200",
    }
  );
}

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function Icon({ d }) {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
        open ? "rotate-180 text-blue-500" : "text-gray-400"
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FactChip({ children }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 ring-1 ring-gray-200 px-2.5 py-1.5">
      {children}
    </div>
  );
}

function FactLabel({ children }) {
  return <span className="text-[11px] text-gray-500">{children}</span>;
}

function FactValue({ children }) {
  return <span className="text-xs font-medium text-gray-700">{children}</span>;
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
      <p className={`text-[11px] text-gray-600 break-all ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export function UserSummaryCard({ user }) {
  const [details, setDetails] = useState(false);
  const rol = roleMeta(user.role);
  const fecha = new Date(user.created_at).toLocaleDateString();

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

      <div className="p-4 sm:p-5 space-y-4">
        {/* Fila principal: avatar con iniciales + nombre + rol */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg sm:text-xl font-bold shadow-md">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <h2
              className="text-lg sm:text-xl font-bold text-gray-900 truncate capitalize"
              title={user.name}
            >
              {user.name}
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${rol.cls}`}
              title={user.role}
            >
              {rol.label}
            </span>
          </div>
        </div>

        {/* Chips de resumen */}
        <div className="flex flex-wrap gap-2">
          <FactChip>
            <span className="text-gray-400">
              <Icon d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
            </span>
            <FactLabel>Registrado</FactLabel>
            <FactValue>{fecha}</FactValue>
          </FactChip>

          {user.slug && (
            <FactChip>
              <span className="text-gray-400">
                <Icon d="M3 10l1.5-5h15L21 10M3 10h18M3 10v9a1 1 0 001 1h16a1 1 0 001-1v-9M9 20v-6h6v6" />
              </span>
              <FactLabel>Tienda</FactLabel>
              <FactValue>@{user.slug}</FactValue>
            </FactChip>
          )}
        </div>

        {/* Datos técnicos plegables */}
        <div>
          <button
            type="button"
            onClick={() => setDetails(!details)}
            aria-expanded={details}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-gray-400">
                <Icon d="M4 17l6-6-6-6M12 19h8" />
              </span>
              <span className="truncate">Datos técnicos</span>
            </span>
            <Chevron open={details} />
          </button>

          <div
            className={`grid transition-all duration-300 ease-out ${
              details
                ? "grid-rows-[1fr] opacity-100 visible mt-2"
                : "grid-rows-[0fr] opacity-0 invisible"
            }`}
          >
            <div className="overflow-hidden min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-gray-50 ring-1 ring-gray-200 p-3">
                <DetailRow label="ID" value={user.id} mono />
                <DetailRow label="Tenant" value={user.tenant_id} mono />
                <DetailRow label="Creado" value={new Date(user.created_at).toLocaleString()} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}