import { useAdminProductsBase } from "./hooks/useAdminProductsBase";
import { CreateProductBase } from "./components/CreateProductBase";

export function AdminProductsBase() {
  const { products, loading, reload } = useAdminProductsBase();

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div>
      <h1>Productos base</h1>

      <CreateProductBase onCreated={reload} />

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.active ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
