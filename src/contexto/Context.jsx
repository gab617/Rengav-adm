import { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useVentas } from "../hooks/useVentas";
import { useProveedores } from "../hooks/useProveedores";
import { useCarrito } from "../hooks/useCarrito";
import { useCategories } from "../hooksSB/useCategories";
import { useProducts } from "../hooksSB/useProducts";
import { usePreferences } from "../hooksSB/usePreferencesUser";
import { useProductFilters } from "../hooksSB/useProductsFilters";
import { useBrands } from "../hooksSB/useBrands";
import { useProfile } from "../hooksSB/useProfile";
const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const ventasHook = useVentas({ userId });
  const proveedoresHook = useProveedores({ userId });
  const carritoHook = useCarrito();

  /* ---- */
  const preferencesUserHook = usePreferences({ userId });
  const categoriesHook = useCategories({ userId });
  const brandsHook = useBrands(userId, categoriesHook.categorias);

  const productsHook = useProducts(
    { userId },
    brandsHook.brands,
    brandsHook.brandsMap,
    brandsHook.loadingBrands
  );

  const unifiedBrands = useMemo(() => {
    if (brandsHook.loadingBrands) return [];

    /* =========================
     1️⃣ MARCAS DEL SISTEMA
  ========================= */
    const systemBrands = brandsHook.brands.map((b) => ({
      key: `system-${b.id}`,
      type: "system",
      brand_id: b.id,
      brand_text: null,
      label: b.name,
      category_ids: b.category_ids ?? [], // <- CLAVE
    }));

    /* =========================
     2️⃣ MARCAS TEXTO (CUSTOM)
  ========================= */
    const textBrandsMap = new Map();

    productsHook.products.forEach((p) => {
      const text = p.products_base?.brand_text;
      const categoryId = p.products_base?.category_id;

      if (!text) return;

      const normalized = text.trim();
      const key = normalized.toLowerCase();

      if (!textBrandsMap.has(key)) {
        textBrandsMap.set(key, {
          key: `text-${key}`,
          type: "text",
          brand_id: null,
          brand_text: normalized,
          label: normalized,
          category_ids: categoryId ? [categoryId] : [],
        });
      } else {
        // agregar categoría si no existe
        const existing = textBrandsMap.get(key);
        if (categoryId && !existing.category_ids.includes(categoryId)) {
          existing.category_ids.push(categoryId);
        }
      }
    });

    /* =========================
     3️⃣ UNIFICAR + ORDENAR
  ========================= */
    return [...systemBrands, ...textBrandsMap.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" })
    );
  }, [brandsHook.brands, brandsHook.loadingBrands, productsHook.products]);

  const productsFiltersHook = useProductFilters(
    productsHook.products,
    categoriesHook.categorias,
    carritoHook.subcategorias,
    unifiedBrands
  );

  const profileHook = useProfile()
  /* console.log(unifiedBrands); */

  // Loading general para el app - espera a que profile esté listo
  const appLoading = profileHook.loadingProfile;

  // 🔹 Aplicar el tema global dark/light
  useEffect(() => {
    if (!preferencesUserHook.preferencias) return;
    if (preferencesUserHook.preferencias.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [preferencesUserHook.preferencias]);

  return (
    <AppContext.Provider
      value={{
        ...ventasHook,
        ...proveedoresHook,
        ...carritoHook,
        ...categoriesHook,
        ...productsHook,
        ...preferencesUserHook,
        ...productsFiltersHook,
        ...brandsHook,
        ...profileHook,
        unifiedBrands,
        appLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
