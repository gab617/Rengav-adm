import { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

const AdminDataContext = createContext();

export function AdminDataProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [productsBase, setProductsBase] = useState([]);
  const [systemCategories, setSystemCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  const loadInitialData = useCallback(async () => {
    if (isLoaded) return;

    const [usersRes, productsRes, countsRes, catsRes] = await Promise.all([
      supabase.from("profiles").select("id, name").order("name"),
      supabase
        .from("products_base")
        .select("id, name, brand_id, category_id, brands(name), categories(name)")
        .order("name"),
      supabase.from("user_products").select("user_id"),
      supabase.from("categories").select("id, name").order("name"),
    ]);

    setUsers(usersRes.data || []);
    setProductsBase(productsRes.data || []);
    setSystemCategories(catsRes.data || []);

    const counts = {};
    countsRes.data?.forEach((up) => {
      counts[up.user_id] = (counts[up.user_id] || 0) + 1;
    });
    setProductCounts(counts);

    setIsLoaded(true);
  }, [isLoaded]);

  // Invalidar usuarios (cuando se crea/edita usuario)
  const invalidateUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, name, role, created_at").order("created_at", { ascending: false });
    setUsers(data || []);
  }, []);

  // Invalidar categorías del sistema (cuando se crea/edita categoría)
  const invalidateCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setSystemCategories(data || []);
  }, []);

  // Invalidar productos base (cuando se agrega/edita producto)
  const invalidateProductsBase = useCallback(async () => {
    const { data } = await supabase
      .from("products_base")
      .select("id, name, brand_id, category_id, brands(name), categories(name)")
      .order("name");
    setProductsBase(data || []);
  }, []);

  // Invalidar productos de un usuario específico
  const invalidateUserProducts = useCallback(async (userId) => {
    const [countsRes, userProductsRes] = await Promise.all([
      supabase.from("user_products").select("user_id"),
      supabase.from("user_products").select("base_id, precio_venta, active, id").eq("user_id", userId),
    ]);

    // Actualizar conteos
    const counts = {};
    countsRes.data?.forEach((up) => {
      counts[up.user_id] = (counts[up.user_id] || 0) + 1;
    });
    setProductCounts(counts);

    return userProductsRes.data || [];
  }, []);

  // Actualizar conteo de un solo usuario (más eficiente)
  const updateUserCount = useCallback((userId, count) => {
    setProductCounts((prev) => ({ ...prev, [userId]: count }));
  }, []);

  // Agregar usuario directamente (actualización optimista)
  const addUserOptimistic = useCallback((newUser) => {
    setUsers((prev) => [newUser, ...prev]);
  }, []);

  const value = {
    // Datos
    users,
    productsBase,
    systemCategories,
    productCounts,
    isLoaded,
    
    // Cargar datos iniciales
    loadInitialData,
    
    // Invalidaciones
    invalidateUsers,
    invalidateCategories,
    invalidateProductsBase,
    invalidateUserProducts,
    updateUserCount,
    addUserOptimistic,
  };

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  return useContext(AdminDataContext);
}