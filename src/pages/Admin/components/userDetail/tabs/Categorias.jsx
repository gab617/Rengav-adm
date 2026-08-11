import { useMemo } from "react";

export function Categorias({ products, loading }) {
  const categorias = useMemo(() => {
    const map = new Map();

    for (const p of products) {
      const isBase = !!p.products_base;
      const product = isBase ? p.products_base : p.user_custom_products;

      const cat = product?.categories?.name || "Sin categoría";
      const sub = product?.subcategories?.name || "General";

      if (!map.has(cat)) map.set(cat, { nombre: cat, subs: new Map() });

      const subs = map.get(cat).subs;
      if (!subs.has(sub)) subs.set(sub, { nombre: sub, count: 0 });
      subs.get(sub).count++;
    }

    return [...map.values()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map((c) => ({
        nombre: c.nombre,
        total: [...c.subs.values()].reduce((acc, s) => acc + s.count, 0),
        subs: [...c.subs.values()].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es")
        ),
      }));
  }, [products]);

  if (loading)
    return <p className="text-gray-500">Cargando categorías...</p>;

  if (categorias.length === 0)
    return (
      <p className="text-gray-500">
        No hay categorías: este usuario no tiene productos asignados.
      </p>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {categorias.map((cat) => (
        <div key={cat.nombre} className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{cat.nombre}</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {cat.total}
            </span>
          </div>

          <ul className="space-y-1">
            {cat.subs.map((sub) => (
              <li
                key={sub.nombre}
                className="flex items-center justify-between text-sm text-gray-600"
              >
                <span>{sub.nombre}</span>
                <span className="text-xs text-gray-400">{sub.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
