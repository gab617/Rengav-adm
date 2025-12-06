import { supabase } from "../services/supabaseClient";

export const getCategoriesBase = async () => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
};

export const getSubcategoriesBase = async () => {
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
};
