import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../services/supabaseClient";

export function useAdminProductsBase(onProductCreated) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products_base")
      .select(`
        id,
        name,
        brand_id,
        category_id,
        subcategory_id,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .order("name");

    if (!error) setProducts(data || []);
    setLoading(false);
  }

  const createProductBase = useCallback(async ({
    name,
    brand_id,
    category_id,
    subcategory_id,
    type_unit = "unit",
  }) => {
    if (!name || !category_id ) {
      throw new Error("Faltan campos obligatorios");
    }

    setCreating(true);

    const { data, error } = await supabase
      .from("products_base")
      .insert([
        {
          name,
          brand_id: brand_id || null,
          category_id,
          subcategory_id,
          type_unit,
        },
      ])
      .select(`
        id,
        name,
        brand_id,
        category_id,
        subcategory_id,
        type_unit,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .single();

    setCreating(false);

    if (error) throw error;

    // Actualización optimista local
    setProducts((prev) =>
      [...prev, data].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    
    // Notificar callback si existe
    if (onProductCreated) {
      onProductCreated();
    }
  }, [onProductCreated]);

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    creating,
    createProductBase,
  };
}