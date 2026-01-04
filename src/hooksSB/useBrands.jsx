import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function useBrands(userId, categoriasUsuario = []) {
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [errorBrands, setErrorBrands] = useState(null);

  useEffect(() => {
    if (!userId) {
      setBrands([]);
      return;
    }

    if (!Array.isArray(categoriasUsuario) || categoriasUsuario.length === 0) {
      setBrands([]);
      return;
    }

    const fetchBrands = async () => {
      setLoadingBrands(true);
      setErrorBrands(null);

      try {
        const categoryIds = categoriasUsuario.map((c) => c.id);

        const { data, error } = await supabase
          .from("brand_categories")
          .select(
            `
            category_id,
            brands (
              id,
              name
            )
          `
          )
          .in("category_id", categoryIds)
          .eq("active", true);

        if (error) throw error;

        // 🔹 deduplicar por id
        const map = {};

        data.forEach((row) => {
          if (!row.brands) return;

          const brandId = row.brands.id;

          if (!map[brandId]) {
            map[brandId] = {
              id: brandId,
              name: row.brands.name,
              category_ids: [],
            };
          }

          map[brandId].category_ids.push(row.category_id);
        });

        const list = Object.values(map).sort((a, b) =>
          a.name.localeCompare(b.name, "es")
        );
        console.log(list)

        setBrands(list);
      } catch (err) {
        console.error(err);
        setErrorBrands(err.message);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [userId, categoriasUsuario]);

  // 🔹 índice por id (clave del sistema)
  const brandsMap = useMemo(() => {
    return brands.reduce((acc, brand) => {
      acc[brand.id] = brand.name;
      return acc;
    }, {});
  }, [brands]);

  return {
    brands, // array para selects
    brandsMap, // lookup rápido por id
    loadingBrands,
    errorBrands,
  };
}
