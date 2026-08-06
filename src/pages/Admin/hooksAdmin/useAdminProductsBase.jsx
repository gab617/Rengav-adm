import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useProfile } from "../../../hooksSB/useProfile";

export function useAdminProductsBase(onProductCreated) {
  const { profile } = useProfile();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [adminCategoryIds, setAdminCategoryIds] = useState([]);
  const [tieneCatalogoDefinido, setTieneCatalogoDefinido] = useState(false);

  async function loadProducts() {
    setLoading(true);

    let adminCatIds = [];

    if (profile?.id) {
      const { data: userCats } = await supabase
        .from("user_categories")
        .select("category_id")
        .eq("user_id", profile.id)
        .eq("active", true);

      adminCatIds = userCats?.map(uc => uc.category_id) || [];
      setAdminCategoryIds(adminCatIds);
      setTieneCatalogoDefinido(adminCatIds.length > 0);
    }

    let relatedUsers = [];
    
    if (profile?.id && (profile.role === "admin" || profile.role === "super_admin")) {
      if (profile.role === "super_admin") {
        const { data: allUsers } = await supabase.from("profiles").select("id");
        relatedUsers = allUsers?.map(u => u.id) || [];
      } else if (profile.tenant_id) {
        const { data: tenantUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("tenant_id", profile.tenant_id);
        relatedUsers = tenantUsers?.map(u => u.id) || [];
      }
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

    let productsWithFlags = productsData || [];

    if (relatedUsers.length > 0) {
      const { data: userProducts } = await supabase
        .from("user_products")
        .select("base_id")
        .in("user_id", relatedUsers);

      const usedBaseIds = new Set(userProducts?.map(up => up.base_id).filter(id => id !== null) || []);

      productsWithFlags = (productsData || []).map(p => ({
        ...p,
        enUso: usedBaseIds.has(p.id),
        enCatalogo: adminCatIds.includes(p.category_id),
      }));
    } else {
      productsWithFlags = (productsData || []).map(p => ({
        ...p,
        enUso: false,
        enCatalogo: adminCatIds.includes(p.category_id),
      }));
    }

    if (!error) setProducts(productsWithFlags);
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
    if (!name || !category_id) {
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

    const newProduct = {
      ...data,
      enUso: false,
      enCatalogo: adminCategoryIds.includes(data.category_id),
    };

    setProducts((prev) =>
      [...prev, newProduct].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );

    if (onProductCreated) {
      onProductCreated();
    }
  }, [onProductCreated, adminCategoryIds]);

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    creating,
    createProductBase,
    adminCategoryIds,
    tieneCatalogoDefinido,
  };
}