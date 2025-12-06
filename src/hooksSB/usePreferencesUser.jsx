import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function usePreferences({ userId }) {
  const [preferencias, setPreferencias] = useState(null);
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);

  // Cargar desde localStorage si existe
  useEffect(() => {
    if (!userId) return;

    const saved = localStorage.getItem(`prefs_${userId}`);
    if (saved) {
      setPreferencias(JSON.parse(saved));
      setCargandoPreferencias(false);
    } else {
      // Fetch desde Supabase
      (async () => {
        setCargandoPreferencias(true);
        const { data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();

        let prefs = data;
        if (!data) {
          // Crear por defecto si no existe
          const { data: creada } = await supabase
            .from("user_preferences")
            .insert({
              user_id: userId,
              theme: "light",
              language: "es",
            })
            .select()
            .single();
          prefs = creada;
        }

        setPreferencias(prefs);
        localStorage.setItem(`prefs_${userId}`, JSON.stringify(prefs));
        setCargandoPreferencias(false);
      })();
    }
  }, [userId]);

  // Actualizar preferencias
  const updatePreferencias = async (nuevosValores) => {
    if (!userId) return;

    const updated = { ...preferencias, ...nuevosValores };
    setPreferencias(updated);
    localStorage.setItem(`prefs_${userId}`, JSON.stringify(updated));

    const { data, error } = await supabase
      .from("user_preferences")
      .update(nuevosValores)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando preferencias:", error);
      return;
    }

    setPreferencias(data);
    localStorage.setItem(`prefs_${userId}`, JSON.stringify(data));
  };



  return {
    preferencias,
    cargandoPreferencias,
    updatePreferencias,
  };
}
