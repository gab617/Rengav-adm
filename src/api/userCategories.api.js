import { supabase } from "../services/supabase";

export const getUserCategories = async () => {
  const { data, error } = await supabase
    .from("user_categories")
    .select("*, categories(*)");

  if (error) throw error;
  return data;
};

export const addUserCategory = async ({ user_id, category_id }) => {
  const { data, error } = await supabase
    .from("user_categories")
    .insert({ user_id, category_id });

  if (error) throw error;
  return data;
};
