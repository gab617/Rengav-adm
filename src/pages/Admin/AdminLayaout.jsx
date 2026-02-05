import { Outlet, Link } from "react-router-dom";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4">
        <h2 className="font-bold mb-4">Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/users">Usuarios</Link>
          <Link to="/admin/assign">Asignar productos</Link>
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
