import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useProfile } from "../../../hooksSB/useProfile";

export function useAdminProductsBase(onProductCreated) {
  const { profile } = useProfile();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadProducts() {
    setLoading(true);

    let relatedUsers = [];
    
    if (profile?.id && profile.role === "admin") {
      const { data: relatedData } = await supabase
        .from("profiles")
        .select("id")
        .eq("parent_admin_id", profile.id);
      
      relatedUsers = relatedData?.map(u => u.id) || [];
      relatedUsers.push(profile.id);
    }

    const { data: productsData, error } = await supabase
      .from("products_base")
      .select(`
        id,
        name,
        type_unit,
        brand_id,
        category_id,
        subcategory_id,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .order("name");

    let productsWithUsage = productsData || [];
    
    if (relatedUsers.length > 0) {
      const { data: userProducts } = await supabase
        .from("user_products")
        .select("base_id")
        .in("user_id", relatedUsers);
      
      const usedBaseIds = new Set(userProducts?.map(up => up.base_id).filter(id => id !== null) || []);
      
      productsWithUsage = (productsData || []).map(p => ({
        ...p,
        enUso: usedBaseIds.has(p.id)
      }));
    } else {
      productsWithUsage = (productsData || []).map(p => ({
        ...p,
        enUso: false
      }));
    }

    if (!error) setProducts(productsWithUsage);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, [profile]);

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
        type_unit,
        brand_id,
        category_id,
        subcategory_id,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .single();

    setCreating(false);

    if (error) throw error;

    const newProduct = { ...data, enUso: false };
    
    // Actualización optimista local
    setProducts((prev) =>
      [...prev, newProduct].sort((a, b) =>
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