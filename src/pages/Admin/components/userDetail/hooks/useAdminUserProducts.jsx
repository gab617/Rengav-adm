import { useEffect, useState } from "react";
import { supabase } from "../../../../../services/supabaseClient";

export function useAdminUserProducts(userId) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_products")
        .select(
          `
    id,
    active,
    precio_compra,
    precio_venta,
    stock,

    products_base (
      id,
      name,
      brands (
        id,
        name
      ),
      categories (
        id,
        name
      ),
      subcategories (
        id,
        name
      )
    ),

    user_custom_products (
      id,
      name,
      brand_text,
      brands (
        id,
        name
      ),
      categories (
        id,
        name
      ),
      subcategories (
        id,
        name
      )
    )
  `
        )
        .eq("user_id", userId);

      if (!mounted) return;

      setProducts(error ? [] : data || []);
      setLoading(false);
    }

    if (userId) loadProducts();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { products, loading };
}
