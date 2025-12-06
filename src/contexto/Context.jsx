import { createContext, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useVentas } from "../hooks/useVentas";
import { useProveedores } from "../hooks/useProveedores";
import { useCarrito } from "../hooks/useCarrito";
import { useCategories } from "../hooksSB/useCategories";
import { useProducts } from "../hooksSB/useProducts";
import { usePreferences } from "../hooksSB/usePreferencesUser";

const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const ventasHook = useVentas({ userId });
  const proveedoresHook = useProveedores({ userId });
  const carritoHook = useCarrito();
  /* ---- */
  const preferencesUserHook = usePreferences({ userId });
  const categoriesHook = useCategories();
  const productsHook = useProducts({userId});

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
