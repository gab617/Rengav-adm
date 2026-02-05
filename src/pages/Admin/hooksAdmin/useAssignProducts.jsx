import { useState } from "react";
import { supabase } from "../../../services/supabaseClient";

export function useAssignUserProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function assignMany(userId, products) {
    setLoading(true);
    setError(null);

    try {
      if (!userId || products.length === 0) {
        throw new Error("Datos inválidos");
      }

      const payload = products.map((p) => ({
        user_id: userId,
        base_id: p.base_id,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        stock: p.stock,
        active: true,
      }));

      /**
       * upsert:
       * - si ya existe (user_id, base_id) → NO duplica
       * - si no existe → inserta
       */
      const { error } = await supabase
        .from("user_products")
        .upsert(payload, {
          onConflict: "user_id,base_id",
        });

      if (error) throw error;

      return true;
    } catch (err) {
      console.error("assignMany error:", err);
      setError(err.message || "Error asignando productos");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    assignMany,
    loading,
    error,
  };
}
