import { useState, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

/**
 * Hook para cargar productos del sistema BAJO DEMANDA
 * Solo se ejecuta cuando se llama a fetchProductosSistema()
 */
export const useProductosSistema = (userId, categorias = [], productosActuales = []) => {
  const [productosSistema, setProductosSistema] = useState([]);
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProductosSistema = useCallback(async () => {
    const categoryIds = categorias.map(c => c.id);
    
    if (!userId) {
      setError("No hay usuario");
      setProductosSistema([]);
      return [];
    }

    if (categoryIds.length === 0) {
      setError("El usuario no tiene categorías asignadas");
      setProductosSistema([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data: productosBase, error: errorBase } = await supabase
        .from("products_base")
        .select(`
          id,
          name,
          brand_id,
          image_url,
          category_id,
          subcategory_id,
          type_unit,
          brands (id, name)
        `)
        .in("category_id", categoryIds)
        .order("name", { ascending: true });

      if (errorBase) throw errorBase;

      const normalizados = productosBase.map(p => ({
        id: p.id,
        base_id: p.id,
        name: p.name,
        brand_id: p.brand_id,
        brand_name: p.brands?.name || null,
        image_url: p.image_url,
        category_id: p.category_id,
        subcategory_id: p.subcategory_id,
        type_unit: p.type_unit,
      }));

      setProductosSistema(normalizados);
      return normalizados;

    } catch (err) {
      console.error("Error fetching productos sistema:", err);
      setError(err.message);
      setProductosSistema([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, categorias]);

  /**
   * Agregar productos en bulk (UNA SOLA PETICIÓN)
   * @param {Array} productos - Array de productos base a agregar
   * @param {Object} datos - Datos comunes para todos (opcional)
   */
  const agregarProductosBulk = useCallback(async (productos, datos = {}) => {
    if (!userId) {
      return { error: "No hay usuario" };
    }

    if (!productos || productos.length === 0) {
      return { error: "No hay productos para agregar" };
    }

    try {
      // Preparar datos para bulk insert
      const precio_compra = datos.precio_compra ?? 0;
      const precio_venta = datos.precio_venta ?? 0;
      const stock = datos.stock ?? 0;
      const descripcion = datos.descripcion ?? null;

      // Crear array de registros para insertar
      const registros = productos.map(producto => ({
        user_id: userId,
        base_id: producto.id,
        precio_compra,
        precio_venta,
        stock,
        descripcion,
        active: true,
      }));

      console.log("➕ Bulk insert:", registros.length, "productos");

      // UNA SOLA PETICIÓN para insertar todos
      const { data: nuevosProductos, error: errorInsert } = await supabase
        .from("user_products")
        .insert(registros)
        .select(`
          id,
          user_id,
          base_id,
          precio_compra,
          precio_venta,
          stock,
          descripcion,
          active,
          products_base (
            id,
            name,
            brand_id,
            image_url,
            category_id,
            subcategory_id,
            type_unit,
            brands (id, name)
          )
        `);

      if (errorInsert) throw errorInsert;

      // Normalizar respuesta
      const normalizados = nuevosProductos.map(p => ({
        ...p,
        tipo: "base",
        products_base: {
          id: p.products_base.id,
          name: p.products_base.name,
          brand: p.products_base.brands?.name || null,
          image_url: p.products_base.image_url,
          category_id: p.products_base.category_id,
          subcategory_id: p.products_base.subcategory_id,
          type_unit: p.products_base.type_unit,
        },
      }));

      // Remover de la lista de disponibles
      const idsAgregados = productos.map(p => p.id);
      setProductosSistema(prev => prev.filter(p => !idsAgregados.includes(p.id)));

      // Agregar a la lista de asignados (actualización instantánea sin peticiones)
      setAssignedProducts(prev => {
        const existingIds = new Set(prev.map(p => p.base_id));
        const nuevos = normalizados.filter(np => !existingIds.has(np.base_id));
        return [...prev, ...nuevos];
      });

      return { success: true, productos: normalizados };

    } catch (err) {
      console.error("Error bulk insert:", err);
      return { error: err.message };
    }
  }, [userId]);

  return {
    productosSistema,
    assignedProducts,
    loading,
    error,
    fetchProductosSistema,
    agregarProductosBulk,
  };
};
