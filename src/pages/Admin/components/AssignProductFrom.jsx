import { useEffect, useMemo, useState } from "react";
import { useAdminProductsBase } from "../hooksAdmin/useAdminProductsBase";
import { useAssignUserProduct } from "../hooksAdmin/useAssignProducts";

export function AssignProductForm({ userId, userProducts, onAssigned }) {
  const { products, loading } = useAdminProductsBase();
  const { assignMany, loading: saving } = useAssignUserProduct();

  const [filters, setFilters] = useState({
    categoryId: "",
    brandId: "",
    search: "",
  });
  const assignedBaseIds = useMemo(() => {
    return new Set(userProducts.filter((p) => p?.products_base?.id).map((p) => p?.products_base?.id));
  }, [userProducts]);

  const [selected, setSelected] = useState({});
  const [confirmMissing, setConfirmMissing] = useState(false);

  /* ========================
     Filtros derivados
  ======================== */

  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (p.categories) map.set(p.categories.id, p.categories.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  const brands = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (p.brands) map.set(p.brands.id, p.brands.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {

      if (assignedBaseIds.has(p.id)) {

        return false;
      }

      if (filters.categoryId && p.categories?.id !== Number(filters.categoryId))
        return false;

      if (filters.brandId && p.brands?.id !== Number(filters.brandId))
        return false;

      if (
        filters.search &&
        !p.name.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;

      return true;
    });
  }, [products, filters, assignedBaseIds]);

  /* ========================
      Helpers
   ======================== */
  
  // Verificar si hay productos con ganancia negativa seleccionados
  const selectedWithNegativeProfit = useMemo(() => {
    return Object.entries(selected)
      .filter(([, v]) => v.checked && v.precioCompra && v.precioVenta)
      .filter(([, v]) => parseFloat(v.precioVenta) < parseFloat(v.precioCompra));
  }, [selected]);

  function toggleProduct(id, checked) {
    setSelected((s) => ({
      ...s,
      [id]: {
        ...s[id],
        checked,
      },
    }));
  }

  function updateField(id, field, value) {
    setSelected((s) => ({
      ...s,
      [id]: {
        ...s[id],
        [field]: value,
      },
    }));
  }

  async function handleSave(force = false) {
    const selectedRows = Object.entries(selected)
      .filter(([, v]) => v.checked)
      .map(([id, v]) => ({
        base_id: Number(id),
        precio_compra: v.precioCompra || null,
        precio_venta: v.precioVenta || null,
        stock: v.stock || null,
      }));

    if (selectedRows.length === 0) return;

    const incompletos = selectedRows.filter(
      (p) => !p.precio_compra || !p.precio_venta || p.stock === null,
    );

    if (incompletos.length > 0 && !force) {
      setConfirmMissing(true);
      return;
    }

    const ok = await assignMany(userId, selectedRows);

    if (ok) {
      setSelected({});
      setConfirmMissing(false);
      onAssigned?.();
    }
  }

  /* ========================
     Render
  ======================== */

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Asignar productos</h3>
      <p className="text-sm text-gray-500">
        Mostrando {filteredProducts.length} de {products.length} productos
        disponibles
      </p>

      {/* ========================
          Filtros
      ======================== */}
      <div className="flex gap-2">
        <select
          value={filters.categoryId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, categoryId: e.target.value }))
          }
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filters.brandId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, brandId: e.target.value }))
          }
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Buscar producto..."
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
        />
      </div>

      {/* ========================
          Tabla
      ======================== */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th />
              <th>Producto</th>
              <th>Marca</th>
              <th>Compra</th>
              <th>Venta</th>
              <th>Stock</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((p) => {
              const row = selected[p.id] || {};
              const precioCompra = parseFloat(row.precioCompra) || 0;
              const precioVenta = parseFloat(row.precioVenta) || 0;
              const ventaMenorQueCompra = precioVenta > 0 && precioCompra > precioVenta;

              return (
                <tr 
                  key={p.id} 
                  className={`border-t ${ventaMenorQueCompra ? "bg-red-50" : ""}`}
                >
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={!!row.checked}
                      onChange={(e) => toggleProduct(p.id, e.target.checked)}
                    />
                  </td>

                  <td className={ventaMenorQueCompra ? "text-red-600 font-medium" : ""}>
                    {p.name}
                    {ventaMenorQueCompra && <span className="ml-1">⚠️</span>}
                  </td>
                  <td>{p.brands?.name}</td>

                  <td>
                    <input
                      type="number"
                      disabled={!row.checked}
                      value={row.precioCompra || ""}
                      onChange={(e) =>
                        updateField(p.id, "precioCompra", e.target.value)
                      }
                      className={`w-full p-1 border rounded ${ventaMenorQueCompra ? "border-red-400 bg-red-100" : ""}`}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      disabled={!row.checked}
                      value={row.precioVenta || ""}
                      onChange={(e) =>
                        updateField(p.id, "precioVenta", e.target.value)
                      }
                      className={`w-full p-1 border rounded ${ventaMenorQueCompra ? "border-red-400 bg-red-100" : ""}`}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      disabled={!row.checked}
                      value={row.stock || ""}
                      onChange={(e) =>
                        updateField(p.id, "stock", e.target.value)
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========================
          Advertencia de ganancia negativa
      ======================== */}
      {selectedWithNegativeProfit.length > 0 && (
        <div className="p-3 border-2 border-red-400 bg-red-50 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm text-red-600">
                {selectedWithNegativeProfit.length} producto(s) con ganancia negativa
              </p>
              <p className="text-xs text-red-500 mt-1">
                El precio de venta es menor al de compra. 
                Ajustá los valores antes de asignar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================
          Guardar
      ======================== */}
      <button
        onClick={() => handleSave()}
        disabled={saving || selectedWithNegativeProfit.length > 0}
        className={`px-4 py-2 rounded ${
          selectedWithNegativeProfit.length > 0
            ? "bg-gray-400 text-gray-600 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {saving ? "Guardando..." : selectedWithNegativeProfit.length > 0 ? "⚠️ Corregir precios" : "Asignar seleccionados"}
      </button>

      {/* ========================
          Confirmación
      ======================== */}
      {confirmMissing && (
        <div className="p-4 border bg-yellow-50 rounded">
          <p className="text-sm mb-2">
            ⚠️ Hay productos sin precio o stock. ¿Querés guardarlos igual para
            que el usuario los complete después?
          </p>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-red-600 text-white rounded"
              onClick={() => handleSave(true)}
            >
              Guardar igual
            </button>

            <button
              className="px-3 py-1 border rounded"
              onClick={() => setConfirmMissing(false)}
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
