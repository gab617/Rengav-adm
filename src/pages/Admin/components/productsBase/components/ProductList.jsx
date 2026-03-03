import { useMemo, useState } from "react";

export function ProductList({ products = [] }) {
    console.log(products);
  
  const [searchName, setSearchName] = useState("");
  const [searchId, setSearchId] = useState("");
  const [searchBrand, setSearchBrand] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchName = p.name
        .toLowerCase()
        .includes(searchName.toLowerCase());

      const matchId = searchId
        ? p.id.toString().includes(searchId)
        : true;

      const matchBrand = searchBrand
        ? (p.brands?.name || "").toLowerCase().includes(searchBrand.toLowerCase())
        : true;

      return matchName && matchId && matchBrand;
    });
  }, [products, searchName, searchId, searchBrand]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Buscar nombre..."
          className="border px-2 py-1 rounded text-sm"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Buscar ID..."
          className="border px-2 py-1 rounded text-sm w-24"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
        />

        <input
          type="text"
          placeholder="Buscar marca..."
          className="border px-2 py-1 rounded text-sm"
          value={searchBrand}
          onChange={(e) => setSearchBrand(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className="border rounded overflow-hidden">
        {filteredProducts.length === 0 && (
          <div className="p-3 text-sm text-gray-500">
            No se encontraron productos
          </div>
        )}

        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center px-3 py-2 border-b text-sm hover:bg-gray-50"
          >
            <div className="flex gap-3 items-center">
              <span className="text-gray-400 w-12">#{p.id}</span>
              <span className="font-medium">{p.name}</span>
              <span className="text-gray-500">
                {p.brands?.name || "—"}
              </span>
            </div>

            <div className="text-xs text-gray-400">
              C:{p.category_id} | S:{p.subcategory_id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}