import { useState } from "react";
import { useAppContext } from "../../contexto/Context";
import { supabase } from "../../services/supabaseClient";

function InputField({ name, label, type = "text", required, placeholder, value, onChange, onBlur, error, isValid, dark }) {
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300 placeholder-gray-400";
  const labelText = dark ? "text-gray-300" : "text-gray-700";

  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-offset-0 ${
            error
              ? `border-red-500 focus:ring-red-500/50 ${inputBg}`
              : isValid
              ? `border-green-500 focus:ring-green-500/50 ${inputBg}`
              : `focus:ring-blue-500/50 ${inputBg}`
          }`}
        />
        {isValid && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            ✓
          </span>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <span>⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function FormProveedor({ onSuccess, onError }) {
  const { profile, preferencias } = useAppContext();
  const dark = preferencias?.theme === "dark";

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    descripcion: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300 placeholder-gray-400";
  const labelText = dark ? "text-gray-300" : "text-gray-700";

  const validateField = (name, value) => {
    switch (name) {
      case "nombre":
        if (!value.trim()) return "El nombre es obligatorio";
        if (value.trim().length < 2) return "Mínimo 2 caracteres";
        return "";
      case "telefono":
        if (!value.trim()) return "El teléfono es obligatorio";
        const cleanPhone = value.replace(/\D/g, "");
        if (cleanPhone.length < 8) return "Teléfono inválido";
        return "";
      case "email":
        if (!value.trim()) return "El email es obligatorio";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Email inválido";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateAll = () => {
    const newErrors = {};
    const requiredFields = ["nombre", "telefono", "email"];
    
    requiredFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    setTouched({ nombre: true, telefono: true, email: true, direccion: true, descripcion: true });
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAll()) {
      onError?.("Por favor, completá los campos obligatorios");
      return;
    }

    if (!profile?.id) {
      onError?.("No se pudo identificar el usuario");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("user_providers").insert({
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim().toLowerCase(),
        direccion: formData.direccion.trim() || null,
        descripcion: formData.descripcion.trim() || null,
        user_id: profile.id,
      });

      if (error) throw error;

      setFormData({
        nombre: "",
        telefono: "",
        email: "",
        direccion: "",
        descripcion: "",
      });
      setErrors({});
      setTouched({});
      
      onSuccess?.("¡Proveedor agregado exitosamente!");
    } catch (err) {
      console.error("Error al crear proveedor:", err);
      onError?.(err.message || "Error al crear el proveedor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-2">
        <span className="text-4xl">🏢</span>
        <h3 className={`text-xl font-bold mt-2 ${textPrimary}`}>
          Nuevo Proveedor
        </h3>
        <p className={`text-sm ${textSecondary}`}>
          Completá los datos del proveedor
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          name="nombre"
          label="Nombre / Razón Social"
          required
          placeholder="Ej: Distribuidora ABC"
          value={formData.nombre}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.nombre ? errors.nombre : ""}
          isValid={touched.nombre && !errors.nombre && formData.nombre}
          dark={dark}
        />
        
        <InputField
          name="telefono"
          label="Teléfono"
          type="tel"
          required
          placeholder="Ej: 11 1234-5678"
          value={formData.telefono}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.telefono ? errors.telefono : ""}
          isValid={touched.telefono && !errors.telefono && formData.telefono}
          dark={dark}
        />
      </div>

      <InputField
        name="email"
        label="Correo Electrónico"
        type="email"
        required
        placeholder="Ej: contacto@proveedor.com"
        value={formData.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.email ? errors.email : ""}
        isValid={touched.email && !errors.email && formData.email}
        dark={dark}
      />

      <InputField
        name="direccion"
        label="Dirección"
        placeholder="Ej: Av. Corrientes 1234, CABA"
        value={formData.direccion}
        onChange={handleChange}
        onBlur={handleBlur}
        dark={dark}
      />

      <div>
        <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>
          Notas / Descripción
        </label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={3}
          placeholder="Notas adicionales sobre el proveedor, condiciones de pago, horarios de entrega, etc."
          className={`w-full px-4 py-3 rounded-xl border ${inputBg} transition-all focus:ring-2 focus:ring-blue-500/50 resize-none`}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-3.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02]"
        >
          {submitting ? (
            <>
              <span className="animate-spin text-lg">⟳</span>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <span className="text-lg">✓</span>
              <span>Crear Proveedor</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
