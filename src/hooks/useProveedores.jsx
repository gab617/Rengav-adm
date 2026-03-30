import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

export const useProveedores = ({ userId }) => {
  const [proveedores, setProveedores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProveedores = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from("user_providers")
        .select("*")
        .eq("user_id", userId)
        .order("nombre", { ascending: true });

      if (fetchError) throw fetchError;
      setProveedores(data || []);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching proveedores:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const agregarProveedor = useCallback(async (proveedor) => {
    try {
      const { data, error: insertError } = await supabase.from("user_providers").insert({
        ...proveedor,
        user_id: userId,
      }).select();

      if (insertError) throw insertError;
      
      if (data && data.length > 0) {
        setProveedores(prev => [...prev, data[0]].sort((a, b) => 
          a.nombre.localeCompare(b.nombre, "es")
        ));
      }
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [userId]);

  const actualizarProveedor = useCallback(async (id, proveedor) => {
    try {
      const camposEditables = {
        nombre: proveedor.nombre,
        telefono: proveedor.telefono,
        email: proveedor.email,
        direccion: proveedor.direccion,
        descripcion: proveedor.descripcion,
      };

      const { data, error: updateError } = await supabase
        .from("user_providers")
        .update(camposEditables)
        .eq("id", id)
        .eq("user_id", userId)
        .select();

      if (updateError) throw updateError;
      
      if (data && data.length > 0) {
        setProveedores(prev => {
          const filtered = prev.filter(p => p.id !== id);
          return [...filtered, data[0]].sort((a, b) => 
            a.nombre.localeCompare(b.nombre, "es")
          );
        });
      }
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [userId]);

  const eliminarProveedor = useCallback(async (id) => {
    try {
      const { data, error: deleteError } = await supabase
        .from("user_providers")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select();

      if (deleteError) throw deleteError;
      
      if (data && data.length > 0) {
        setProveedores(prev => prev.filter(p => p.id !== data[0].id));
      }
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [userId]);

  const agregarPedido = useCallback((producto) => {
    setPedidos((prev) => {
      const existe = prev.find((p) => p.id === producto.id);

      if (existe) {
        return prev.map((p) =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      }

      return [...prev, { ...producto, cantidad: 1 }];
    });
  }, []);

  const restarPedido = useCallback((id) => {
    setPedidos((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, cantidad: p.cantidad - 1 } : p))
        .filter((p) => p.cantidad > 0)
    );
  }, []);

  const eliminarPedido = useCallback((id) => {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleInputPedido = useCallback((id, cantidad) => {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, cantidad: cantidad === "" ? "" : parseInt(cantidad) || "" }
          : p
      )
    );
  }, []);

  const handleBlurPedido = useCallback((id, cantidad) => {
    let cant = parseInt(cantidad, 10);
    if (isNaN(cant) || cant < 1) cant = 1;

    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, cantidad: cant } : p))
    );
  }, []);

  const limpiarPedidos = useCallback(() => setPedidos([]), []);

  return {
    proveedores,
    pedidos,
    loading,
    error,
    
    fetchProveedores,
    agregarProveedor,
    actualizarProveedor,
    eliminarProveedor,

    agregarPedido,
    restarPedido,
    eliminarPedido,
    limpiarPedidos,
    handleInputPedido,
    handleBlurPedido,
  };
};
