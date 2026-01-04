import React, { useState } from "react";
import { useAppContext } from "../../../contexto/Context";

export function ListProveedores({ proveedores }) {
  const { eliminarProveedor, actualizarProveedor, preferencias } =
    useAppContext();
  const dark = preferencias?.theme === "dark";

  const [editando, setEditando] = useState(null);
  const [datosEditados, setDatosEditados] = useState({});

  const handleEditClick = (proveedor) => {
    setEditando(proveedor.id);
    setDatosEditados(proveedor);
  };

  const handleChange = (e) => {
    setDatosEditados({
      ...datosEditados,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    await actualizarProveedor(editando, datosEditados);
    setEditando(null);
  };

  const cardBg = dark
    ? "bg-gray-800 border-gray-700 text-gray-200"
    : "bg-white border-gray-300 text-gray-900";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const labelText = dark ? "text-gray-200" : "text-gray-600";

  return (
    <div
      className={`grid grid-cols-2 gap-3 text-lg w-[85%] mx-auto p-2 rounded-xl shadow-inner transition-colors duration-300`}
    >
      {proveedores.map((proveedor) => (
        <div
          key={proveedor.id}
          className={`p-4 rounded-3xl shadow-lg hover:shadow-2xl transition duration-300 border ${cardBg}`}
        >
          {editando === proveedor.id ? (
            // Formulario de edición
            <div className="space-y-3">
              {["nombre", "telefono", "email", "direccion", "descripcion"].map(
                (campo) => (
                  <div key={campo} className="flex flex-col text-sm">
                    <label className={`font-semibold ${labelText}`}>
                      {campo.charAt(0).toUpperCase() + campo.slice(1)}
                    </label>
                    {campo === "descripcion" ? (
                      <textarea
                        name={campo}
                        value={datosEditados[campo]}
                        onChange={handleChange}
                        className={`w-full p-2 rounded-lg ${inputBg}`}
                      />
                    ) : (
                      <input
                        type={campo === "email" ? "email" : "text"}
                        name={campo}
                        value={datosEditados[campo]}
                        onChange={handleChange}
                        className={`w-full p-2 rounded-lg ${inputBg}`}
                      />
                    )}
                  </div>
                )
              )}

              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  onClick={handleSubmit}
                >
                  Guardar
                </button>
                <button
                  className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                  onClick={() => setEditando(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            // Vista normal
            <>
              <div className="flex justify-between items-center border-b pb-1 mb-4">
                <h3
                  className={`text-xl font-bold ${
                    dark ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  {proveedor.nombre}
                </h3>
                <div className="flex items-center gap-3">
                  <p className={dark ? "text-gray-300" : "text-gray-500"}>
                    Registrado:
                  </p>
                  <p className="text-lg text-gray-500">
                    📅 {new Date(proveedor.fecha_registro).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div
                className={`space-y-2 ${
                  dark ? "text-gray-200" : "text-gray-700"
                }`}
              >
                <p className="flex items-center gap-2">
                  <span className="font-semibold">📞 Teléfono:</span>{" "}
                  {proveedor.telefono}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">✉️ Email:</span>{" "}
                  {proveedor.email}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">📍 Dirección:</span>{" "}
                  {proveedor.direccion}
                </p>
                <div className="flex gap-1 mt-2">
                  <button
                    className="cursor-pointer px-3 py-2 bg-blue-500 text-white text-lg rounded-full hover:bg-blue-600 transition duration-300 shadow-md hover:scale-105"
                    onClick={() => handleEditClick(proveedor)}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminarProveedor(proveedor.id)}
                    className="cursor-pointer px-5 py-2 bg-red-500 text-white text-lg rounded-full hover:bg-red-600 transition duration-300 shadow-md hover:scale-105"
                  >
                    ✘
                  </button>
                  <a
                    href={`https://wa.me/+549${proveedor.telefono}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-[3em] cursor-pointer bg-green-500 text-white text-lg rounded-full hover:bg-green-600 transition duration-300 shadow-md hover:scale-105 flex items-center justify-center"
                  >
                    <img
                      className="w-5 h-5"
                      src="./wtsimg.png"
                      alt="WhatsApp"
                    />
                  </a>
                </div>
              </div>

              <hr
                className={`my-1 ${
                  dark ? "border-gray-700" : "border-gray-300"
                }`}
              />

              <div className="flex justify-between items-center">
                <p
                  className={`italic ${
                    dark ? "text-gray-300" : "text-gray-600"
                  } min-h-[2em] max-h-[2.7em] overflow-y-auto`}
                >
                  {proveedor.descripcion || "Sin descripción"}
                </p>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
