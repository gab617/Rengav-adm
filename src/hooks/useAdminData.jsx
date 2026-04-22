import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { useProfile } from "../hooksSB/useProfile";

const AdminDataContext = createContext();

export function AdminDataProvider({ children }) {
  const { profile } = useProfile();
  const [users, setUsers] = useState([]);
  const [productsBase, setProductsBase] = useState([]);
  const [systemCategories, setSystemCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [userCategoriesMap, setUserCategoriesMap] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  const getRelatedUserIds = useCallback(async () => {
    if (!profile?.id || profile.role !== "admin") return null;
    
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("parent_admin_id", profile.id);
    
    const relatedIds = data?.map(u => u.id) || [];
    relatedIds.push(profile.id);
    return relatedIds;
  }, [profile]);

  const loadInitialData = useCallback(async () => {
    if (isLoaded) return;

    const relatedUserIds = await getRelatedUserIds();

    const [usersRes, productsRes, countsRes, catsRes, userCatsRes] = await Promise.all([
      relatedUserIds 
        ? supabase.from("profiles").select("id, name, role, created_at, parent_admin_id").in("id", relatedUserIds).order("created_at", { ascending: false })
        : supabase.from("profiles").select("id, name, role, created_at").order("created_at", { ascending: false }),
      supabase
        .from("products_base")
        .select("id, name, brand_id, category_id, subcategory_id, type_unit, brands(name), categories(name), subcategories(name)")
        .order("name"),
      relatedUserIds
        ? supabase.from("user_products").select("user_id").in("user_id", relatedUserIds)
        : supabase.from("user_products").select("user_id"),
      supabase.from("categories").select("id, name").order("name"),
      relatedUserIds
        ? supabase.from("user_categories").select("user_id, category_id").in("user_id", relatedUserIds)
        : supabase.from("user_categories").select("user_id, category_id"),
    ]);

    setUsers(usersRes.data || []);
    setProductsBase(productsRes.data || []);
    setSystemCategories(catsRes.data || []);

    // Agrupar conteos por usuario
    const counts = {};
    countsRes.data?.forEach((up) => {
      counts[up.user_id] = (counts[up.user_id] || 0) + 1;
    });
    setProductCounts(counts);

    // Agrupar categorías por usuario
    const userCats = {};
    userCatsRes.data?.forEach((uc) => {
      if (!userCats[uc.user_id]) userCats[uc.user_id] = [];
      userCats[uc.user_id].push(uc.category_id);
    });
    setUserCategoriesMap(userCats);

    setIsLoaded(true);
  }, [isLoaded, getRelatedUserIds]);

  // Invalidar cuando cambia el profile
  useEffect(() => {
    setIsLoaded(false);
  }, [profile?.id]);

  // Forzar recarga cuando cambia el admin logueado
  useEffect(() => {
    if (profile?.id && profile.role === "admin" && isLoaded) {
      loadInitialData();
    }
  }, [profile?.id]);

  // Invalidar usuarios (cuando se crea/edita usuario)
  const invalidateUsers = useCallback(async () => {
    const relatedUserIds = await getRelatedUserIds();
    const { data } = relatedUserIds
      ? await supabase.from("profiles").select("id, name, role, created_at, parent_admin_id").in("id", relatedUserIds).order("created_at", { ascending: false })
      : await supabase.from("profiles").select("id, name, role, created_at").order("created_at", { ascending: false });
    setUsers(data || []);
  }, [getRelatedUserIds]);

  // Invalidar categorías del sistema (cuando se crea/edita categoría)
  const invalidateCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setSystemCategories(data || []);
  }, []);

  // Invalidar productos base (cuando se agrega/edita producto)
  const invalidateProductsBase = useCallback(async () => {
    const { data } = await supabase
      .from("products_base")
      .select("id, name, brand_id, category_id, subcategory_id, type_unit, brands(name), categories(name), subcategories(name)")
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

  // Invalidar categorías de un usuario específico
  const invalidateUserCategories = useCallback(async (userId) => {
    const { data } = await supabase
      .from("user_categories")
      .select("category_id")
      .eq("user_id", userId);
    
    setUserCategoriesMap((prev) => ({
      ...prev,
      [userId]: data?.map(uc => uc.category_id) || []
    }));
  }, []);

  const value = {
    // Datos
    users,
    productsBase,
    systemCategories,
    productCounts,
    userCategoriesMap,
    isLoaded,
    
    // Funciones
    setUserCategoriesMap,
    
    // Cargar datos iniciales
    loadInitialData,
    
    // Invalidaciones
    invalidateUsers,
    invalidateCategories,
    invalidateProductsBase,
    invalidateUserProducts,
    updateUserCount,
    addUserOptimistic,
    invalidateUserCategories,
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