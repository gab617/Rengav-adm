import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Productos } from "./pages/productos/Productos";
import { Ventas } from "./pages/ventas/Ventas";
import { Proveedores } from "./pages/proveedores/Proveedores";
import Pedidos from "./pages/pedidos/Pedidos";
import { toast, ToastContainer } from "react-toastify";
import { Login } from "./pages/login/Login";
import { NavBar } from "./navBar/NavBar";
import { Usuario } from "./pages/usuario/Usuario";

const App = () => {
  const location = useLocation();

  // Ocultar NavBar en login
  const hideNavBar = location.pathname === "/";

  return (
    <div className="mt-2">
      <ToastContainer
        position="bottom-left"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme="dark"
        toastClassName="rounded-md shadow-lg text-white"
        bodyClassName="text-md font-semibold"
        style={{ zIndex: 9999 }} // <-- clave
      />

      {/* Mostrar solo si NO estamos en login */}
      {!hideNavBar && <NavBar />}

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/usuario" element={<Usuario />} />
      </Routes>
    </div>
  );
};

export default App;
