import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAppContext } from "../../contexto/Context";

export function AdminLayout() {
  const { preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: "📊" },
    { path: "/admin/prods-base", label: "Productos", icon: "📦" },
    { path: "/admin/users", label: "Usuarios", icon: "👥" },
    { path: "/admin/assign", label: "Asignar", icon: "🔗" },
  ];

  const isActive = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgDark = dark ? "bg-gray-800" : "bg-white";
  const bgLight = dark ? "bg-gray-900" : "bg-gray-50";
  const borderColor = dark ? "border-gray-700" : "border-gray-200";

  return (
    <div className="flex flex-col h-screen">
      {/* HEADER MOBILE */}
      <header className={`
        lg:hidden flex items-center justify-between p-4 border-b shrink-0
        ${bgDark} ${borderColor}
      `}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-lg ${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className={`text-lg font-bold ${textPrimary}`}>⚙️ Admin</h1>
        </div>
        
        {/* Active tab indicator */}
        <div className="flex items-center gap-1">
          {navItems.map(item => (
            isActive(item.path) && (
              <span key={item.path} className="text-xl">{item.icon}</span>
            )
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR DESKTOP */}
        <aside className={`
          hidden lg:flex w-64 border-r shrink-0 p-4 flex-col
          ${bgDark} ${borderColor}
        `}>
          <div className="mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${textPrimary}`}>
              <span>⚙️</span>
              <span>Panel Admin</span>
            </h2>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Gestión del sistema
            </p>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive(item.path)
                    ? dark
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                      : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : dark
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className={`pt-4 border-t ${borderColor}`}>
            <Link
              to="/productos"
              className={`
                flex items-center gap-2 text-sm
                ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}
              `}
            >
              <span>←</span>
              <span>Volver a la app</span>
            </Link>
          </div>
        </aside>

        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <aside className={`
              absolute left-0 top-0 bottom-0 w-72 p-4 flex flex-col transform transition-transform
              ${bgDark} ${borderColor}
            `} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-xl font-bold flex items-center gap-2 ${textPrimary}`}>
                    <span>⚙️</span>
                    <span>Admin</span>
                  </h2>
                  <p className={`text-xs mt-1 ${textSecondary}`}>
                    Gestión del sistema
                  </p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-2 rounded-lg ${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${isActive(item.path)
                        ? dark
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                          : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                        : dark
                          ? "text-gray-300 hover:bg-gray-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }
                    `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className={`pt-4 border-t ${borderColor}`}>
                <Link
                  to="/productos"
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-2 text-sm
                    ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}
                  `}
                >
                  <span>←</span>
                  <span>Volver a la app</span>
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* CONTENIDO */}
        <main className={`flex-1 p-4 lg:p-6 overflow-auto ${bgLight}`}>
          <Outlet />
        </main>
      </div>

      {/* BOTTOM NAV MOBILE */}
      <nav className={`
        lg:hidden grid grid-cols-4 border-t shrink-0
        ${bgDark} ${borderColor}
      `}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex flex-col items-center py-3 gap-1 transition-all
              ${isActive(item.path)
                ? "text-blue-500"
                : dark
                  ? "text-gray-400"
                  : "text-gray-500"
              }
            `}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
