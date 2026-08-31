import { useState } from "react";
import { toast } from "react-toastify";
import { useSucursalSettings } from "./useSucursalSettings";

function inputCls() {
  return "mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
}

function ContactoPagosForm({ effective, saving, onSave }) {
  const [form, setForm] = useState(() => ({
    telefono_whatsapp: effective.telefono_whatsapp || "",
    alias_transferencia: effective.alias_transferencia || "",
    cbu_transferencia: effective.cbu_transferencia || "",
    facebook_url: effective.facebook_url || "",
    instagram_url: effective.instagram_url || "",
    x_url: effective.x_url || "",
  }));

  const [cbuError, setCbuError] = useState("");

  const set = (key) => (e) => {
    if (key === "cbu_transferencia") setCbuError("");
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSave = async () => {
    if (saving) return;

    const cbu = form.cbu_transferencia.trim().replace(/\D/g, "");
    if (form.cbu_transferencia.trim() && cbu.length !== 22) {
      setCbuError("El CBU tiene que tener 22 dígitos.");
      return;
    }

    const res = await onSave(form);
    if (res?.ok) {
      setForm({
        telefono_whatsapp: res.effective.telefono_whatsapp || "",
        alias_transferencia: res.effective.alias_transferencia || "",
        cbu_transferencia: res.effective.cbu_transferencia || "",
        facebook_url: res.effective.facebook_url || "",
        instagram_url: res.effective.instagram_url || "",
        x_url: res.effective.x_url || "",
      });
      toast.success("Datos de contacto y pagos guardados");
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <div>
          <label className="block">
            <span className="text-sm text-gray-700">Teléfono de WhatsApp</span>
            <input
              value={form.telefono_whatsapp}
              onChange={set("telefono_whatsapp")}
              placeholder="Ej: 54 11 5555 1234"
              inputMode="tel"
              className={inputCls()}
            />
          </label>
          <p className="text-xs text-gray-400 mt-1">
            Es el número al que llegan los pedidos. Incluí el código de país
            (54 para Argentina), porque el botón de la tienda abre
            wa.me con este número.
          </p>
        </div>

        <div>
          <label className="block">
            <span className="text-sm text-gray-700">Alias para transferencia</span>
            <input
              value={form.alias_transferencia}
              onChange={set("alias_transferencia")}
              placeholder="Ej: mipanaderia.mp"
              className={inputCls()}
            />
          </label>
          <p className="text-xs text-gray-400 mt-1">
            Se muestra al cliente cuando elige pagar por transferencia.
          </p>
        </div>

        <div>
          <label className="block">
            <span className="text-sm text-gray-700">CBU</span>
            <input
              value={form.cbu_transferencia}
              onChange={set("cbu_transferencia")}
              placeholder="22 dígitos"
              inputMode="numeric"
              className={inputCls()}
            />
          </label>
          {cbuError ? (
            <p className="text-xs text-red-500 mt-1">{cbuError}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Se muestra junto al alias cuando el cliente elige transferir.
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          Dejá un campo vacío y guardá para que esa sucursal vuelva a heredar el
          valor del negocio.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Redes sociales</h3>

        <div>
          <label className="block">
            <span className="text-sm text-gray-700">Facebook</span>
            <input
              value={form.facebook_url}
              onChange={set("facebook_url")}
              placeholder="Ej: https://facebook.com/mipanaderia"
              inputMode="url"
              className={inputCls()}
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-sm text-gray-700">Instagram</span>
            <input
              value={form.instagram_url}
              onChange={set("instagram_url")}
              placeholder="Ej: https://instagram.com/mipanaderia"
              inputMode="url"
              className={inputCls()}
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-sm text-gray-700">X (Twitter)</span>
            <input
              value={form.x_url}
              onChange={set("x_url")}
              placeholder="Ej: https://x.com/mipanaderia"
              inputMode="url"
              className={inputCls()}
            />
          </label>
          <p className="text-xs text-gray-400 mt-1">
            Pegá el link completo de cada red. Los que dejes vacíos no se
            muestran en la tienda.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando..." : "Guardar contactos y pagos"}
        </button>
      </div>
    </div>
  );
}

export function ContactoPagos({ profile }) {
  const { effective, loading, saving, save } = useSucursalSettings(
    profile.id,
    profile.tenant_id,
  );

  if (!profile?.tenant_id) {
    return (
      <div className="bg-white rounded-xl shadow p-5 text-center text-gray-500">
        Este usuario no pertenece a un negocio, así que no tiene tienda propia
        para configurar contactos y pagos.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
        Cargando datos de contacto y pagos...
      </div>
    );
  }

  return (
    <ContactoPagosForm
      key={profile.id}
      effective={effective}
      saving={saving}
      onSave={save}
    />
  );
}
