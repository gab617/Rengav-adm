import { SucursalSettings } from "./configuracion/SucursalSettings";

export function Configuracion({ profile }) {
  if (!profile?.tenant_id) {
    return (
      <div className="bg-white rounded-xl shadow p-5 text-center text-gray-500">
        Este usuario no pertenece a un negocio, así que no tiene tienda
        propia para estilizar.
      </div>
    );
  }

  return <SucursalSettings profile={profile} />;
}
