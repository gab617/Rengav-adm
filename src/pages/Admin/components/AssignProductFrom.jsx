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
  console.log(userProducts);
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
        console.log(p);

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

              return (
                <tr key={p.id} className="border-t">
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={!!row.checked}
                      onChange={(e) => toggleProduct(p.id, e.target.checked)}
                    />
                  </td>

                  <td>{p.name}</td>
                  <td>{p.brands?.name}</td>

                  <td>
                    <input
                      type="number"
                      disabled={!row.checked}
                      value={row.precioCompra || ""}
                      onChange={(e) =>
                        updateField(p.id, "precioCompra", e.target.value)
                      }
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
          Guardar
      ======================== */}
      <button
        onClick={() => handleSave()}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {saving ? "Guardando..." : "Asignar seleccionados"}
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
