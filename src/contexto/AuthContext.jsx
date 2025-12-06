// contexto/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient"

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // usuario actual
  const [loading, setLoading] = useState(true);  // para evitar parpadeos

  useEffect(() => {
    // Obtener sesión al cargar
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
        setUser(data?.session?.user ?? null);
      setLoading(false);
    }

    loadSession();

    // Escuchar cambios de sesión (login/logout/refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
