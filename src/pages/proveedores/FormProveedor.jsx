import React, { useState } from "react";
import { useAppContext } from "../../contexto/Context";

export function FormProveedor() {
  const { agregarProveedor, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [isFormVisible, setIsFormVisible] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.telefono || !formData.email) {
      alert("Por favor, complete los campos obligatorios.");
      return;
    }

    agregarProveedor({
      nombre: formData.nombre,
      telefono: formData.telefono,
      email: formData.email,
      direccion: formData.direccion || null,
    });

    setFormData({ nombre: "", telefono: "", email: "", direccion: "" });
    setIsFormVisible(false);
  };

  const cardBg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const inputBg = dark
    ? "bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300 placeholder-gray-500";
  const labelText = dark ? "text-gray-200" : "text-gray-900";

  return (
    <div className="w-1/3 mx-auto mt-4">
      <button
        onClick={() => setIsFormVisible(!isFormVisible)}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-500 transition"
      >
        {isFormVisible ? "✖ Cancelar" : "➕ Agregar Proveedor"}
      </button>

      <div
        className={`transition-all duration-700 ease-in-out ${
          isFormVisible
            ? "opacity-100 scale-100 max-h-[1000px]"
            : "opacity-0 scale-90 max-h-0"
        } overflow-hidden mt-4 p-6 rounded-lg shadow-md ${cardBg}`}
      >
        <h2 className="text-xl font-bold mb-4 text-center text-blue-600">
          Agregar Proveedor
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Nombre *", name: "nombre", type: "text", required: true },
            { label: "Teléfono *", name: "telefono", type: "tel", required: true },
            { label: "Email *", name: "email", type: "email", required: true },
            { label: "Dirección", name: "direccion", type: "text", required: false },
          ].map(({ label, name, type, required }) => (
            <div key={name}>
              <label className={`block font-semibold mb-1 ${labelText}`}>{label}</label>
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className={`w-full p-2 rounded border ${inputBg}`}
                required={required}
                placeholder={type === "email" ? "correo@ejemplo.com" : ""}
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-500 transition"
          >
            Guardar Proveedor
          </button>
        </form>
      </div>
    </div>
  );
}
