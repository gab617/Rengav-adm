import { useSucursalSettings } from "./useSucursalSettings";
import { ThemeEditor } from "./ThemeEditor";

export function SucursalSettings({ profile }) {
  const { sucursal, tenantNombre, effective, loading, saving, save } =
    useSucursalSettings(profile.id, profile.tenant_id);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
        Cargando configuración de la tienda...
      </div>
    );
  }

  return (
    <ThemeEditor
      key={profile.id}
      profile={profile}
      sucursal={sucursal}
      tenantNombre={tenantNombre}
      effective={effective}
      saving={saving}
      onSave={save}
    />
  );
}
