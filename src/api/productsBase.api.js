import { supabase } from "../services/supabase";

export const getProductsBase = async () => {
  const { data, error } = await supabase
    .from("products_base")
    .select("*");

  if (error) throw error;
  return data;
};
