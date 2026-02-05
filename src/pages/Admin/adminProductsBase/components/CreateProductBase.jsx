import { useState } from "react";
import { supabase } from "../../services/supabaseClient";

export function CreateProductBase({ onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from("products_base")
      .insert({ name: name.trim() });

    setLoading(false);

    if (!error) {
      setName("");
      onCreated();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Nombre del producto"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button disabled={loading}>
        {loading ? "Creando..." : "Agregar"}
      </button>
    </form>
  );
}
