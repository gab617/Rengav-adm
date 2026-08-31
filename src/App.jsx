import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Productos } from "./pages/productos/Productos";
import { Ventas } from "./pages/ventas/Ventas";
import { Proveedores } from "./pages/proveedores/Proveedores";
import Pedidos from "./pages/pedidos/Pedidos";
import { ToastContainer } from "react-toastify";
import { Login } from "./pages/login/Login";
import { NavBar } from "./navBar/NavBar";
import { NotificadorPedidos } from "./components/NotificadorPedidos";
import { Usuario } from "./pages/usuario/Usuario";
import { AdminLayout } from "./pages/Admin/AdminLayaout";
import { AdminRoute } from "./pages/Admin/AdminRoute";
import { AdminDashboard } from "./pages/Admin/components/adminDashboard/AdminDashboard";
import { Users } from "./pages/Admin/components/Users";
import { AssignProducts } from "./pages/Admin/components/AssignProducts";
import { UserDetail } from "./pages/Admin/components/userDetail/UserDetail";
import { ProductsBase } from "./pages/Admin/components/productsBase/ProductsBase";
import { Tenants } from "./pages/Admin/components/Tenants";
import { InfoApp } from "./pages/infoApp/InfoApp";
import { PedidosWeb } from "./pages/pedidosWeb/PedidosWeb";

const App = () => {
  const location = useLocation();
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Ocultar NavBar en login
  const hideNavBar = location.pathname === "/";

  return (
    <div className="mt-2">
      <ToastContainer
        position={esMobile ? "top-center" : "bottom-left"}
        autoClose={esMobile ? 2000 : 3000}
        hideProgressBar={esMobile}
        closeButton={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        limit={3}
        theme="dark"
        toastClassName="rounded-lg shadow-lg text-white !bg-gray-900/85 !backdrop-blur-sm px-3 py-1.5 text-xs md:text-sm md:px-4 md:py-2"
        bodyClassName="font-semibold"
        style={{ zIndex: 9999 }} // <-- clave
      />

      {/* Notificación global de pedidos nuevos (solo con sesión activa) */}
      <NotificadorPedidos />

      {/* Mostrar solo si NO estamos en login */}
      {!hideNavBar && <NavBar />}

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/pedidos-web" element={<PedidosWeb />} />
        <Route path="/usuario" element={<Usuario />} />
        <Route path="/info-app" element={<InfoApp />} />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="/admin/assign" element={<AssignProducts />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/users/:userId" element={<UserDetail />} />
          <Route path="/admin/prods-base" element={<ProductsBase />} />
          <Route path="/admin/negocios" element={<Tenants />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
