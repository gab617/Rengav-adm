import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Faltan variables de entorno de Supabase");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      "x-client-info": "comercio-app-web",
    },
  },
});

export async function fetchData(tabla, options = {}) {
  const {
    select = "*",
    filters = [],
    order,
    limit,
    single = false,
  } = options;

  let query = supabase.from(tabla).select(select);

  filters.forEach(({ column, value, operator = "eq" }) => {
    if (operator === "eq") query = query.eq(column, value);
    if (operator === "like") query = query.like(column, `%${value}%`);
    if (operator === "gt") query = query.gt(column, value);
    if (operator === "gte") query = query.gte(column, value);
    if (operator === "lt") query = query.lt(column, value);
    if (operator === "lte") query = query.lte(column, value);
    if (operator === "in") query = query.in(column, value);
  });

  if (order) {
    query = query.order(order.column, { ascending: order.ascending ?? true });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = single
    ? await query.single()
    : await query;

  if (error) {
    console.error(`❌ Error en ${tabla}:`, error.message);
    throw error;
  }

  return data;
}

export async function insertData(tabla, payload) {
  const { data, error } = await supabase.from(tabla).insert(payload).select();

  if (error) {
    console.error(`❌ Error insertando en ${tabla}:`, error.message);
    throw error;
  }

  return data;
}

export async function updateData(tabla, id, payload) {
  const { data, error } = await supabase
    .from(tabla)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`❌ Error actualizando ${tabla}:`, error.message);
    throw error;
  }

  return data;
}

export async function deleteData(tabla, id) {
  const { error } = await supabase.from(tabla).delete().eq("id", id);

  if (error) {
    console.error(`❌ Error eliminando de ${tabla}:`, error.message);
    throw error;
  }
}
