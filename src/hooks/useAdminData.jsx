import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
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
  const loadingRef = useRef(false);

  const getTenantUserIds = useCallback(async () => {
    if (!profile?.id || (profile.role !== "admin" && profile.role !== "super_admin")) return null;
    
    if (profile.role === "super_admin") {
      const { data } = await supabase.from("profiles").select("id");
      return data?.map(u => u.id) || [];
    }

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", profile.tenant_id);
    
    return data?.map(u => u.id) || [];
  }, [profile]);

  const loadInitialData = useCallback(async () => {
    if (loadingRef.current || !profile?.id) return;
    loadingRef.current = true;

    const userIds = await getTenantUserIds();
    const isSuperAdmin = profile?.role === "super_admin";

    const [usersRes, productsRes, countsRes, catsRes, userCatsRes] = await Promise.all([
      userIds && userIds.length > 0
        ? supabase.from("profiles").select("id, name, role, created_at, tenant_id, parent_admin_id").in("id", userIds).order("created_at", { ascending: false })
        : supabase.from("profiles").select("id, name, role, created_at, tenant_id, parent_admin_id").order("created_at", { ascending: false }),
      supabase
        .from("products_base")
        .select("id, name, brand_id, category_id, subcategory_id, type_unit, image_url, brands(name), categories(name), subcategories(name)")
        .order("name"),
      userIds && userIds.length > 0
        ? supabase.from("user_products").select("user_id").in("user_id", userIds)
        : supabase.from("user_products").select("user_id"),
      supabase.from("categories").select("id, name").order("name"),
      userIds && userIds.length > 0
        ? supabase.from("user_categories").select("user_id, category_id").in("user_id", userIds)
        : supabase.from("user_categories").select("user_id, category_id"),
    ]);

    setUsers(usersRes.data || []);
    setProductsBase(productsRes.data || []);
    setSystemCategories(catsRes.data || []);

    const counts = {};
    countsRes.data?.forEach((up) => {
      counts[up.user_id] = (counts[up.user_id] || 0) + 1;
    });
    setProductCounts(counts);

    const userCats = {};
    userCatsRes.data?.forEach((uc) => {
      if (!userCats[uc.user_id]) userCats[uc.user_id] = [];
      userCats[uc.user_id].push(uc.category_id);
    });
    setUserCategoriesMap(userCats);

    setIsLoaded(true);
    loadingRef.current = false;
  }, [isLoaded, getTenantUserIds, profile?.role]);

  useEffect(() => {
    setIsLoaded(false);
  }, [profile?.id, profile?.tenant_id]);

  useEffect(() => {
    if (profile?.id && (profile.role === "admin" || profile.role === "super_admin")) {
      loadInitialData();
    }
  }, [profile?.id, profile?.tenant_id]);

  const invalidateUsers = useCallback(async () => {
    const userIds = await getTenantUserIds();
    const { data } = userIds && userIds.length > 0
      ? await supabase.from("profiles").select("id, name, role, created_at, tenant_id, parent_admin_id").in("id", userIds).order("created_at", { ascending: false })
      : await supabase.from("profiles").select("id, name, role, created_at, tenant_id, parent_admin_id").order("created_at", { ascending: false });
    setUsers(data || []);
  }, [getTenantUserIds]);

  const invalidateCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setSystemCategories(data || []);
  }, []);

  const invalidateProductsBase = useCallback(async () => {
    const { data } = await supabase
      .from("products_base")
      .select("id, name, brand_id, category_id, subcategory_id, type_unit, image_url, brands(name), categories(name), subcategories(name)")
      .order("name");
    setProductsBase(data || []);
  }, []);

  const invalidateUserProducts = useCallback(async (userId) => {
    const [countsRes, userProductsRes] = await Promise.all([
      supabase.from("user_products").select("user_id"),
      supabase.from("user_products").select("base_id, precio_venta, precio_compra, stock, descripcion, active, id").eq("user_id", userId),
    ]);

    const counts = {};
    countsRes.data?.forEach((up) => {
      counts[up.user_id] = (counts[up.user_id] || 0) + 1;
    });
    setProductCounts(counts);

    return userProductsRes.data || [];
  }, []);

  const updateUserCount = useCallback((userId, count) => {
    setProductCounts((prev) => {
      if (prev[userId] === count) return prev;
      return { ...prev, [userId]: count };
    });
  }, []);

  const addUserOptimistic = useCallback((newUser) => {
    setUsers((prev) => [newUser, ...prev]);
  }, []);

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
    users,
    productsBase,
    systemCategories,
    productCounts,
    userCategoriesMap,
    isLoaded,
    setUserCategoriesMap,
    loadInitialData,
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