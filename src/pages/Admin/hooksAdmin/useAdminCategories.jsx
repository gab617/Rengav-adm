import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabaseClient";

export function useAdminCategories() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadCategories() {
    setLoading(true);

    const { data: catData, error: catError } = await supabase
      .from("categories")
      .select("id, name, color")
      .order("name");

    const { data: subData, error: subError } = await supabase
      .from("subcategories")
      .select("id, name, category_id")
      .order("name");

    if (!catError) setCategories(catData || []);
    if (!subError) setSubcategories(subData || []);

    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // 🔥 Agrupar subcategorías por categoría (estructura lista para UI)
  const categoriesWithSubs = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      subcategories: subcategories.filter(
        (sub) => sub.category_id === cat.id
      ),
    }));
  }, [categories, subcategories]);

  // 🔥 Helper útil
  function getSubcategoriesByCategory(categoryId) {
    return subcategories.filter(
      (sub) => sub.category_id === Number(categoryId)
    );
  }

  return {
    categories,
    subcategories,
    categoriesWithSubs,
    getSubcategoriesByCategory,
    loading,
    reload: loadCategories,
  };
}