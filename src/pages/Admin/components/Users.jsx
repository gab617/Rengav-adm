import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../contexto/Context";
import { useAdminUsers } from "../hooksAdmin/useAdminUsers";

function shortId(id) {
  return id.slice(0, 8) + "…";
}

export function Users() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useAppContext();
  const { users, loading } = useAdminUsers(profile, profileLoading);

  if (profileLoading)
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando perfil...
      </div>
    );

  if (!profile || profile.role !== "admin")
    return (
      <div className="p-6 text-center text-red-500">
        No tienes acceso
      </div>
    );

  if (loading)
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando usuarios...
      </div>
    );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">
        Usuarios
      </h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="text-left py-3 px-4">Usuario</th>
              <th className="text-left py-3 px-4">Nombre</th>
              <th className="text-left py-3 px-4">Rol</th>
              <th className="text-left py-3 px-4">
                Registrado
              </th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                <td
                  className="py-3 px-4 font-mono text-gray-600"
                  title={u.id}
                >
                  {shortId(u.id)}
                </td>

                <td className="py-3 px-4">
                  {u.name}
                </td>

                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>

                <td className="py-3 px-4 text-gray-600">
                  {new Date(u.created_at).toLocaleDateString(
                    "es-AR"
                  )}
                </td>

                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() =>
                      navigate(`/admin/users/${u.id}`)
                    }
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
