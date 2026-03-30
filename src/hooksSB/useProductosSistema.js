import { useState, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

/**
 * Hook para cargar productos del sistema BAJO DEMANDA
 * Solo se ejecuta cuando se llama a fetchProductosSistema()
 */
export const useProductosSistema = (userId, categorias = [], productosActuales = []) => {
  const [productosSistema, setProductosSistema] = useState([]);
  const [productosInactivos, setProductosInactivos] = useState([]);
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProductosSistema = useCallback(async () => {
    const categoryIds = categorias.map(c => c.id);
    
    if (!userId) {
      setError("No hay usuario");
      setProductosSistema([]);
      setProductosInactivos([]);
      return [];
    }

    if (categoryIds.length === 0) {
      setError("El usuario no tiene categorías asignadas");
      setProductosSistema([]);
      setProductosInactivos([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // Productos base del sistema
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

      // Obtener productos INACTIVOS del usuario
      const { data: inactivosData, error: errorInactivos } = await supabase
        .from("user_products")
        .select("base_id")
        .eq("user_id", userId)
        .eq("active", false);

      if (errorInactivos) {
        console.warn("Error al obtener productos inactivos:", errorInactivos);
      }

      const inactivosSet = new Set((inactivosData || []).map(p => p.base_id));
      setProductosInactivos(Array.from(inactivosSet));

      return normalizados;

    } catch (err) {
      console.error("Error fetching productos sistema:", err);
      setError(err.message);
      setProductosSistema([]);
      setProductosInactivos([]);
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
      // Primero verificar cuáles productos YA existen en la base de datos
      const baseIds = productos.map(p => p.id);
      const { data: existentes, error: errorCheck } = await supabase
        .from("user_products")
        .select("base_id")
        .eq("user_id", userId)
        .in("base_id", baseIds);

      if (errorCheck) throw errorCheck;

      const existentesSet = new Set((existentes || []).map(e => e.base_id));
      const nuevosProductos = productos.filter(p => !existentesSet.has(p.id));

      if (nuevosProductos.length === 0) {
        return { error: "Todos los productos seleccionados ya están agregados" };
      }

      if (nuevosProductos.length < productos.length) {
        console.log(`⚠️ ${productos.length - nuevosProductos.length} productos ya existían, se agregarán ${nuevosProductos.length}`);
      }

      // Preparar datos para bulk insert
      const precio_compra = datos.precio_compra ?? 0;
      const precio_venta = datos.precio_venta ?? 0;
      const stock = datos.stock ?? 0;
      const descripcion = datos.descripcion ?? null;

      // Crear array de registros para insertar (solo los nuevos)
      const registros = nuevosProductos.map(producto => ({
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
      const { data: insertados, error: errorInsert } = await supabase
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
      const normalizados = (insertados || []).map(p => ({
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
      const idsAgregados = nuevosProductos.map(p => p.id);
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
    productosInactivos,
    assignedProducts,
    loading,
    error,
    fetchProductosSistema,
    agregarProductosBulk,
  };
};
