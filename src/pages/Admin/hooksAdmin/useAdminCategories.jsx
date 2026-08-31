import { useMemo } from "react";
import { useSizesContext } from "../../../contexto/SizesContext";
import { useAdminData } from "../../../hooks/useAdminData";

export function useAdminCategories() {
  const { sizes, categorySizes, getSizesByCategory } = useSizesContext();
  const { systemCategories, isLoaded, invalidateCategories } = useAdminData();

  const categories = useMemo(() => {
    return systemCategories.map(({ subcategories: _, ...cat }) => cat);
  }, [systemCategories]);

  const subcategories = useMemo(() => {
    return systemCategories.flatMap((cat) =>
      (cat.subcategories || []).map((sub) => ({
        ...sub,
        category_id: cat.id,
      }))
    );
  }, [systemCategories]);

  const categoriesWithSubs = useMemo(() => {
    return systemCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      subcategories: (cat.subcategories || []).map((sub) => ({
        ...sub,
        category_id: cat.id,
      })),
    }));
  }, [systemCategories]);

  function getSubcategoriesByCategory(categoryId) {
    return subcategories.filter(
      (sub) => sub.category_id === Number(categoryId)
    );
  }

  async function reload() {
    await invalidateCategories();
  }

  return {
    categories,
    subcategories,
    sizes,
    categorySizes,
    categoriesWithSubs,
    getSubcategoriesByCategory,
    getSizesByCategory,
    loading: !isLoaded,
    reload,
  };
}
