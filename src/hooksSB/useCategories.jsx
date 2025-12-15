import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

export function useCategories({ userId } = {}) {
  // 🔹 BASE (todo el sistema)
  const [categorias_base, setCategoriasBase] = useState([]);
  const [subcategorias_base, setSubcategoriasBase] = useState([]);

  // 🔹 USUARIO
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      /* ======================================================
         1️⃣ TODAS LAS CATEGORÍAS BASE
      ====================================================== */
      const { data: catsBase, error: errCatsBase } = await supabase
        .from("categories")
        .select("id, name, description, color")
        .order("name");

      if (errCatsBase) throw errCatsBase;

      const categoriasBaseNorm = (catsBase || []).map((c) => ({
        id: c.id,
        nombre: c.name,
        descripcion: c.description,
        color: c.color,
      }));

      setCategoriasBase(categoriasBaseNorm);

      /* ======================================================
         2️⃣ TODAS LAS SUBCATEGORÍAS BASE
      ====================================================== */
      const { data: subsBase, error: errSubsBase } = await supabase
        .from("subcategories")
        .select("id, category_id, name, description")
        .order("name");

      if (errSubsBase) throw errSubsBase;

      const subcategoriasBaseNorm = (subsBase || []).map((s) => ({
        id: s.id,
        id_categoria: s.category_id,
        nombre: s.name,
        descripcion: s.description,
      }));

      setSubcategoriasBase(subcategoriasBaseNorm);

      /* ======================================================
         3️⃣ CATEGORÍAS ACTIVAS DEL USUARIO
      ====================================================== */
      const { data: userCats, error: errUserCats } = await supabase
        .from("user_categories")
        .select("category_id")
        .eq("user_id", userId)
        .eq("active", true);

      if (errUserCats) throw errUserCats;

      const userCategoryIds = userCats.map((uc) => uc.category_id);

      const categoriasUsuario = categoriasBaseNorm.filter((c) =>
        userCategoryIds.includes(c.id)
      );

      setCategorias(categoriasUsuario);

      /* ======================================================
         4️⃣ SUBCATEGORÍAS DE ESAS CATEGORÍAS
      ====================================================== */
      const subcategoriasUsuario = subcategoriasBaseNorm.filter((s) =>
        userCategoryIds.includes(s.id_categoria)
      );

      setSubcategorias(subcategoriasUsuario);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  return {
    // 🔹 BASE
    categorias_base,
    subcategorias_base,

    // 🔹 USUARIO
    categorias,
    subcategorias,

    loading,
    error,
    reload: load,
  };
}
