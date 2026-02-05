import { useEffect, useState } from "react";
import { supabase } from "../../../services/supabaseClient";

export function useAdminProductsBase() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products_base")
      .select(`
        id,
        name,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .order("name");

    setProducts(error ? [] : data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return { products, loading, reload: loadProducts };
}
