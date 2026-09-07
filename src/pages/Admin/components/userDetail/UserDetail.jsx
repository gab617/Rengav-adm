import { useParams } from "react-router-dom";
import { useAdminUser } from "./hooks/useAdminUser";
import { useAdminUserProducts } from "./hooks/useAdminUserProducts";
import { useState } from "react";
import { Productos } from "./tabs/Productos";
import { Categorias } from "./tabs/Categorias";
import { Configuracion } from "./tabs/Configuracion";
import { ContactoPagos } from "./tabs/configuracion/ContactoPagos";
import { UserSummaryCard } from "./UserSummaryCard";

const TABS = [
  { id: "productos", label: "Productos" },
  { id: "categorias", label: "Categorías" },
  { id: "configuracion", label: "Configuración" },
  { id: "contacto", label: "Contacto y pagos" },
];

export function UserDetail() {
  const { userId } = useParams();
  const { user, loading: userLoading } = useAdminUser(userId);
  const { products, loading: productsLoading } = useAdminUserProducts(userId);

  const [activeTab, setActiveTab] = useState("productos");

  if (userLoading)
    return (
      <div className="p-6 text-center text-gray-500">Cargando usuario...</div>
    );

  if (!user)
    return (
      <div className="p-6 text-center text-red-500">Usuario no encontrado</div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          Detalle de usuario
        </h1>
      </div>

      {/* User summary */}
      <UserSummaryCard user={user} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "productos" && (
        <Productos
          user={user}
          products={products}
          loading={productsLoading}
        />
      )}

      {activeTab === "categorias" && (
        <Categorias products={products} loading={productsLoading} />
      )}

      {activeTab === "configuracion" && <Configuracion profile={user} />}

      {activeTab === "contacto" && <ContactoPagos profile={user} />}
    </div>
  );
}
