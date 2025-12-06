import { useEffect, useState } from "react";
import { getCategoriesBase, getSubcategoriesBase } from "../api/categories.api";

export function useCategories(autoLoad = true) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad]);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, subs] = await Promise.all([
        getCategoriesBase(),
        getSubcategoriesBase(),
      ]);

      setCategories(cats || []);
      setSubcategories(subs || []);
    } catch (err) {
      console.error("Error loading categories/subcategories:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    subcategories,
    loading,
    reload: load,
  };
}
