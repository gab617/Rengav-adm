import React, { useState } from "react";
import { useAuth } from "../../contexto/AuthContext";
import { useNavigate } from "react-router-dom";
import { FormCustomProduct } from "../productos/components/FormCustomProduct";
import { useAppContext } from "../../contexto/Context";
import { UlCustomProducts } from "./components/UlCustomProducts";
import { Config } from "./components/Config";
import { InactiveProductsViewer } from "./components/InactiveProductsViewer";

export function Usuario() {
  const { logout, user } = useAuth();
  const { products, customProducts, preferencias, inactiveProducts } =
    useAppContext(); // agregamos preferencias
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const dark = preferencias?.theme === "dark";

  const handleLogout = async () => {
    await logout();
    navigate("/"); // redirige al login/home
  };

  const bgContainer = dark
    ? "bg-gray-900 text-gray-200"
    : "bg-gray-50 text-gray-900";
  const modalBg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const btnCancel = dark
    ? "bg-gray-600 text-gray-200 hover:bg-gray-500"
    : "bg-gray-200 text-gray-900 hover:bg-gray-300";
  const btnLogout = "bg-red-500 text-white hover:bg-red-600";

  return (
    <div
      className={`flex flex-col items-center gap-4 p-4 ${bgContainer} min-h-screen`}
    >
      <div className="w-full h-0.5 bg-linear-to-r from-transparent via-purple-500 to-transparent rounded-full"></div>

      <div className="flex justify-between w-full">
        <div className="text-xl font-semibold">
          <h1>
            Productos personalizados (Creados por el usuario):{" "}
            {customProducts.length}
          </h1>
          {console.log(products, customProducts)}
          <h1>
            Productos Totales:{" "}
            {products.length ? products.length : customProducts.length}
          </h1>
        </div>
        <div className="flex flex-col w-[24em] gap-2">
          <Config />

          {/*           <h1 className="text-xl font-bold mb-2">
            Usuario e-mail: {user?.email}
          </h1> */}

          <button
            onClick={() => setShowModal(true)}
            className={` px-4 py-2 rounded transition ${btnLogout}`}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="w-full h-0.5 bg-linear-to-r from-transparent via-purple-500 to-transparent rounded-full"></div>

      <div className="w-full items-start ">
        <FormCustomProduct userId={user?.id} />
      </div>

      <div className="w-full">
        <UlCustomProducts customProducts={customProducts} />
      </div>

      <InactiveProductsViewer inactiveProducts={inactiveProducts} />


      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div
            className={`rounded-xl shadow-lg p-6 w-96 flex flex-col gap-4 ${modalBg}`}
          >
            <h2 className="text-lg font-bold">Confirmar cierre de sesión</h2>
            <p
              className={`text-gray-400" {dark ? "text-gray-400" : "text-gray-600"}`}
            >
              ¿Estás seguro de que quieres cerrar sesión?
            </p>
            <p>{user?.email}</p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className={`px-4 py-2 rounded transition ${btnCancel}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className={`px-4 py-2 rounded transition ${btnLogout}`}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
