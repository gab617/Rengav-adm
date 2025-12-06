import { supabase } from "../services/supabase";

export const getUserProducts = async (userId) => {
  const { data, error } = await supabase
    .from("user_products")
    .select("*, products_base(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
};
