import { supabase } from "../services/supabase";

export const getSubcategoriesBase = async (categoryId) => {
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .order("name");

  if (error) throw error;
  return data;
};
