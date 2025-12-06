import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

export const useProveedores = ({ userId }) => {
  const [proveedores, setProveedores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState(null);

  // ============================
  //      FETCH PROVEEDORES
  // ============================
  const fetchProveedores = async () => {
    try {
      const { data, error } = await supabase
        .from("user_providers") // ← TABLA CORRECTA
        .select("*")
        .eq("user_id", userId)
        .order("nombre", { ascending: true });

      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================
  //      CRUD PROVEEDORES
  // ============================
  const agregarProveedor = async (proveedor) => {
    try {
      const { error } = await supabase.from("user_providers").insert({
        ...proveedor,
        user_id: userId,
      });

      if (error) throw error;
      fetchProveedores();
    } catch (err) {
      setError(err.message);
    }
  };

  // 🔥 ACTUALIZAR PROVEEDOR usando user_id para evitar romper RLS
  const actualizarProveedor = async (id, proveedor) => {
    try {
      const camposEditables = {
        nombre: proveedor.nombre,
        telefono: proveedor.telefono,
        email: proveedor.email,
        direccion: proveedor.direccion,
        descripcion: proveedor.descripcion,
      };

      const { error } = await supabase
        .from("user_providers")
        .update(camposEditables)
        .eq("id", id);

      if (error) throw error;
      fetchProveedores();
    } catch (err) {
      setError(err.message);
    }
  };

  // 🔥 ELIMINAR PROVEEDOR usando user_id para pasar RLS
  const eliminarProveedor = async (id) => {
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar este proveedor?"
    );
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from("user_providers")
        .delete()
        .eq("id", id)
        .eq("user_id", userId); // ⬅️ también obligatorio con RLS

      if (error) throw error;
      fetchProveedores();
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================
  //      MANEJO PEDIDOS
  // ============================

  // ➤ Agregar o incrementar cantidad
  const agregarPedido = (producto) => {
    setPedidos((prev) => {
      const existe = prev.find((p) => p.id === producto.id);

      if (existe) {
        return prev.map((p) =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      }

      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  // ➤ Restar (si queda 0 → eliminar)
  const restarPedido = (id) => {
    setPedidos((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, cantidad: p.cantidad - 1 } : p))
        .filter((p) => p.cantidad > 0)
    );
  };

  // ➤ Eliminar
  const eliminarPedido = (id) => {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  };

  // ➤ Input editable
  const handleInputPedido = (id, cantidad) => {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, cantidad: cantidad === "" ? "" : parseInt(cantidad) || "" }
          : p
      )
    );
  };

  // ➤ Validación al perder foco
  const handleBlurPedido = (id, cantidad) => {
    let cant = parseInt(cantidad, 10);
    if (isNaN(cant) || cant < 1) cant = 1;

    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, cantidad: cant } : p))
    );
  };

  // ➤ Vaciar lista
  const limpiarPedidos = () => setPedidos([]);

  // ============================
  //          INIT
  // ============================
  useEffect(() => {
    if (userId) fetchProveedores();
  }, [userId]);

  return {
    proveedores,
    pedidos,
    error,

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
