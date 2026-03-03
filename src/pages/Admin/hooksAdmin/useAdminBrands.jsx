import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabaseClient";

export function useAdminBrands() {
  const [brands, setBrands] = useState([]);
  const [brandCategories, setBrandCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔹 ÚNICA carga inicial
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*");

      const { data: relationsData, error: relationsError } = await supabase
        .from("brand_categories")
        .select("*")
        .eq("active", true);

      if (brandsError || relationsError) {
        setError(brandsError?.message || relationsError?.message);
      } else {
        setBrands(brandsData);
        setBrandCategories(relationsData);
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

  // 🔹 Obtener marcas por categoría (SIN query)
  const getBrandsByCategory = (categoryId) => {
    if (!categoryId) return [];

    const brandIds = brandCategories
      .filter((bc) => bc.category_id === categoryId)
      .map((bc) => bc.brand_id);

    return brands.filter((brand) => brandIds.includes(brand.id));
  };

  // 🔹 Crear marca (actualiza estado local)
  const createBrand = async (name) => {
    const { data, error } = await supabase
      .from("brands")
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;

    setBrands((prev) => [...prev, data]);
    return data;
  };

  // 🔹 Vincular marca a categoría (actualiza estado local)
  const linkBrandToCategory = async (brandId, categoryId) => {
    const { data, error } = await supabase
      .from("brand_categories")
      .insert([{ brand_id: brandId, category_id: categoryId }])
      .select()
      .single();

    if (error) throw error;

    setBrandCategories((prev) => [...prev, data]);
  };

  return {
    brands,
    brandCategories,
    loading,
    error,
    getBrandsByCategory,
    createBrand,
    linkBrandToCategory,
  };
}