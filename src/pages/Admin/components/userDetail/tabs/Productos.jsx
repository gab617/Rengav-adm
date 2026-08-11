import { AssignProductForm } from "../../AssignProductFrom";

export function Productos({ user, products, loading }) {
  return (
    <div className="space-y-6">
      <AssignProductForm
        userProducts={products}
        userId={user.id}
        onAssigned={() => {}}
      />

      {/* Products */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Productos asignados
        </h2>

        {loading ? (
          <p className="text-gray-500">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500">No tiene productos asignados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 px-3">Producto</th>
                  <th className="text-right py-2 px-3">Compra</th>
                  <th className="text-right py-2 px-3">Venta</th>
                  <th className="text-right py-2 px-3">Stock</th>
                  <th className="text-center py-2 px-3">Activo</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => {
                  const isBase = !!p.products_base;
                  const product = isBase
                    ? p.products_base
                    : p.user_custom_products;

                  const brandName = isBase
                    ? product?.brands?.name
                    : product?.brands?.name || product?.brand_text;

                  const categoryName = product?.categories?.name;
                  const subcategoryName = product?.subcategories?.name;

                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-b-0 hover:bg-gray-50 transition"
                    >
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-1">
                          {/* Nombre + tipo */}
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              {product?.name || "Producto sin nombre"}
                            </span>

                            {isBase ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Base
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                Custom
                              </span>
                            )}
                          </div>

                          {/* Metadata */}
                          {(brandName || categoryName) && (
                            <div className="text-xs text-gray-500">
                              {brandName && (
                                <span className="font-medium">{brandName}</span>
                              )}

                              {categoryName && (
                                <>
                                  {" · "}
                                  {categoryName}
                                </>
                              )}

                              {subcategoryName && (
                                <>
                                  {" / "}
                                  {subcategoryName}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right">
                        ${p.precio_compra}
                      </td>

                      <td className="py-2 px-3 text-right">
                        ${p.precio_venta}
                      </td>

                      <td className="py-2 px-3 text-right">{p.stock}</td>

                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
