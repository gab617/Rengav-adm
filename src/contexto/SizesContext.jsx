import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "./AuthContext";

const SizesContext = createContext();

export function SizesProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [sizes, setSizes] = useState([]);
  const [categorySizes, setCategorySizes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Nada de fetch ANÓNIMO: si no hay sesión no pedimos nada.
    // loading se mantiene true para que la UI espere (loader) sin pintar talles vacíos.
    if (authLoading || !user) {
      setSizes([]);
      setCategorySizes([]);
      setLoading(true);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    async function load() {
      const [sizesRes, csRes] = await Promise.all([
        supabase.from("sizes").select("id, name, sort_order").order("sort_order").order("id"),
        supabase.from("category_sizes").select("category_id, size_id, position").order("position"),
      ]);

      if (active) {
        setSizes(sizesRes.data || []);
        setCategorySizes(csRes.data || []);
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const sizesById = useMemo(() => {
    const map = {};
    sizes.forEach((s) => { map[s.id] = s; });
    return map;
  }, [sizes]);

  const getSizesByCategory = (categoryId) => {
    const catId = Number(categoryId);
    const ids = categorySizes
      .filter((cs) => cs.category_id === catId)
      .sort((a, b) => a.position - b.position)
      .map((cs) => cs.size_id);
    return sizes.filter((s) => ids.includes(s.id));
  };

  const getProductSizes = (product) => {
    const talles = product?.talles || [];
    if (!talles.length) return [];
    return talles
      .map((id) => sizesById[id])
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  };

  const getProductSizeNames = (product) => {
    const talles = product?.products_base?.talles || [];
    return talles.map((id) => sizesById[id]?.name).filter(Boolean);
  };

  return (
    <SizesContext.Provider
      value={{
        sizes,
        categorySizes,
        sizesById,
        loading,
        getSizesByCategory,
        getProductSizes,
        getProductSizeNames,
      }}
    >
      {children}
    </SizesContext.Provider>
  );
}

export const useSizesContext = () => useContext(SizesContext);
