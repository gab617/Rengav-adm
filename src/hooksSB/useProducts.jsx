import { useState, useEffect, useMemo } from "react";
import { supabase } from "../services/supabaseClient";

export const useProducts = (
  { userId, categoryId = null, subcategoryId = null } = {},
  brands,
  brandsMap,
  loadingBrands
) => {
  const [products, setProducts] = useState([]);
  const [customProducts, setCustomProducts] = useState([]);
  const [inactiveProducts, setInactiveProducts] = useState([]);
  const [loadingProductos, setLoadingProductosFetch] = useState(true);
  const [loadingProductsIndividual, setLoadingProductsIndividual] = useState(
    {}
  );
  const [error, setError] = useState(null);
  const setLoadingFor = (id, value) => {
    setLoadingProductsIndividual((prev) => ({ ...prev, [id]: value }));
  };

  const resolveBrandName = (brandId) => {
    if (!brandId) return null;
    return brandsMap?.[brandId] ?? null;
  };

  const sanitizeUserProduct = (obj) => {
    const allowed = [
      "descripcion",
      "precio_compra",
      "precio_venta",
      "stock",
      "proveedor_nombre",
      "base_id",
      "custom_id",
      "user_id",
      "active",
    ];

    const cleaned = {};
    for (const key of allowed) {
      if (obj[key] !== undefined) cleaned[key] = obj[key];
    }
    return cleaned;
  };

  const fetchProductos = async () => {
    setLoadingProductosFetch(true);
    setError(null);

    try {
      let query;

      if (userId) {
        query = supabase
          .from("user_products")
          .select(
            `
            id,
            user_id,
            base_id,
            custom_id,
            descripcion,
            precio_compra,
            precio_venta,
            stock,
            proveedor_nombre,
            active,
            products_base (
              id,
              name,
              brand_id,
              image_url,
              category_id,
              subcategory_id
            ),
            user_custom_products (
              id,
              name,
              brand_id,
              image_url,
              category_id,
              subcategory_id,
              brand_text
            )
          `
          )
          .eq("user_id", userId);
      } else {
        query = supabase.from("products_base").select("*");
      }

      if (categoryId) query.eq("products_base.category_id", categoryId);
      if (subcategoryId)
        query.eq("products_base.subcategory_id", subcategoryId);

      const { data, error } = await query;
      if (error) throw error;

      if (!userId) {
        setProducts(data);
        setCustomProducts([]);
        setInactiveProducts([]);
        return;
      }

      const activos = data.filter((p) => p.active !== false);
      const inactivos = data.filter((p) => p.active === false);

      const normalizar = (p) => {
        const isCustom = p.custom_id !== null;

        if (isCustom) {
          return {
            ...p,
            tipo: "custom",
            products_base: {
              id: p.user_custom_products.id,
              name: p.user_custom_products.name,
              brand: resolveBrandName(p.user_custom_products.brand_id),
              image_url: p.user_custom_products.image_url,
              category_id: p.user_custom_products.category_id,
              subcategory_id: p.user_custom_products.subcategory_id,
              brand_text: p.user_custom_products.brand_text,
            },
          };
        }

        return {
          ...p,
          tipo: "base",
          products_base: {
            id: p.products_base.id,
            name: p.products_base.name,
            brand: resolveBrandName(p.products_base.brand_id),
            image_url: p.products_base.image_url,
            category_id: p.products_base.category_id,
            subcategory_id: p.products_base.subcategory_id,
            brand_text: null,
          },
        };
      };
      const activosNormalizados = activos.map(normalizar);
      const inactivosNormalizados = inactivos.map(normalizar);
      console.log(activosNormalizados);

      setProducts(activosNormalizados);
      setInactiveProducts(inactivosNormalizados);

      setCustomProducts(activosNormalizados.filter((p) => p.tipo === "custom"));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setTimeout(() => {
        setLoadingProductosFetch(false);
      }, 100);
    }
  };

  const crearCustomProduct = async ({
    name,
    brandId,
    brandText,
    categoryId,
    subcategoryId,
    descripcion,
    precioCompra,
    precioVenta,
    proveedor,
    stock,
    userId,
    unifiedBrands, // 👈 pasar o tomar del contexto
  }) => {
    setLoadingProductosFetch(true);

    try {
      /* ----------------------------------
       1️⃣ CREAR PRODUCTO CUSTOM BASE
    ---------------------------------- */
      const { data: customProd, error: err1 } = await supabase
        .from("user_custom_products")
        .insert([
          {
            user_id: userId,
            name,
            brand_id: brandId || null,
            brand_text: brandText || null,
            category_id: categoryId,
            subcategory_id: subcategoryId || null,
          },
        ])
        .select()
        .single();

      if (err1) throw err1;

      /* ----------------------------------
       2️⃣ CREAR PRODUCTO USUARIO
    ---------------------------------- */
      const { data: newProduct, error: err2 } = await supabase
        .from("user_products")
        .insert([
          {
            user_id: userId,
            custom_id: customProd.id,
            descripcion: descripcion || null,
            precio_compra: Number(precioCompra),
            precio_venta: Number(precioVenta),
            proveedor_nombre: proveedor || null,
            stock: Number(stock),
            active: true,
          },
        ])
        .select()
        .single();

      if (err2) throw err2;

      /* ----------------------------------
       3️⃣ NORMALIZAR MARCA (CLAVE)
    ---------------------------------- */
      const brandName =
        (customProd.brand_id && brandsMap?.[customProd.brand_id]) ||
        customProd.brand_text ||
        null;

      /* ----------------------------------
       4️⃣ OBJETO FINAL NORMALIZADO
    ---------------------------------- */
      const productFull = {
        ...newProduct,
        tipo: "custom",
        products_base: {
          name: customProd.name,
          brand_id: customProd.brand_id,
          brand_text: customProd.brand_text,
          brand: brandName, // 👈 ahora SIEMPRE existe
          category_id: customProd.category_id,
          subcategory_id: customProd.subcategory_id,
          image_url: customProd.image_url || null,
        },
        user_custom_products: customProd,
      };

      /* ----------------------------------
       5️⃣ ACTUALIZAR ESTADO
    ---------------------------------- */
      setProducts((prev) => [...prev, productFull]);
      setCustomProducts((prev) => [...prev, productFull]);

      return productFull;
    } catch (error) {
      console.error("Error creando producto:", error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoadingProductosFetch(false);
    }
  };

  const actualizarProducto = async (id, producto) => {
    console.log(producto);
    try {
      const limpio = sanitizeUserProduct(producto);

      const prev = products.find((p) => p.id === id);

      const { error } = await supabase
        .from("user_products")
        .update(limpio)
        .eq("id", id);

      if (error) throw error;

      let necesitaActualizarCustom = false;

      if (
        producto.tipo === "custom" &&
        producto.custom_id &&
        prev?.user_custom_products
      ) {
        necesitaActualizarCustom =
          producto.nombre !== prev.user_custom_products.name ||
          (producto.brand ?? null) !==
            (prev.user_custom_products.brand ?? null) ||
          (producto.image_url ?? null) !==
            (prev.user_custom_products.image_url ?? null);
      }

      if (necesitaActualizarCustom) {
        const brandData = producto.user_custom_products.brand_id
          ? {
              brand_id: producto.user_custom_products.brand_id,
              brand_text: null,
            }
          : producto.user_custom_products.brand_text
          ? {
              brand_id: null,
              brand_text: producto.user_custom_products.brand_text,
            }
          : { brand_id: null, brand_text: null };

        const { error: errCustom } = await supabase
          .from("user_custom_products")
          .update({
            name: producto.nombre,
            ...brandData,
            image_url: producto.image_url ?? null,
          })
          .eq("id", producto.custom_id);

        if (errCustom) throw errCustom;
      }

      setProducts((prevList) =>
        prevList.map((p) =>
          p.id === id
            ? {
                ...p,
                ...limpio,
                nombre: producto.nombre,
                user_custom_products:
                  p.tipo === "custom"
                    ? {
                        ...p.user_custom_products,
                        name: producto.nombre,
                        brand: producto.brand ?? p.user_custom_products.brand,
                        image_url:
                          producto.image_url ??
                          p.user_custom_products.image_url,
                      }
                    : p.user_custom_products,
              }
            : p
        )
      );

      setCustomProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...limpio, nombre: producto.nombre } : p
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarProducto = async (id) => {
    setLoadingFor(id, true);
    try {
      const { error } = await supabase
        .from("user_products")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.code === "23503") {
          const { error: errUpdate } = await supabase
            .from("user_products")
            .update({ active: false, stock: 0 })
            .eq("id", id);

          if (errUpdate) throw errUpdate;

          setProducts((prev) => prev.filter((p) => p.id !== id));

          setInactiveProducts((prev) => {
            const eliminado = products.find((p) => p.id === id);
            if (!eliminado) return prev;
            return [...prev, { ...eliminado, active: false, stock: 0 }];
          });

          setCustomProducts((prev) => prev.filter((p) => p.id !== id));

          return { desactivado: true };
        }

        throw error;
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
      setCustomProducts((prev) => prev.filter((p) => p.id !== id));

      return { eliminado: true };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoadingFor(id, false);
    }
  };

  const reactivarProducto = async (id) => {
    setLoadingFor(id, true);

    try {
      const prod = inactiveProducts.find((p) => p.id === id);
      if (!prod) return;

      const { error } = await supabase
        .from("user_products")
        .update({ active: true })
        .eq("id", id);

      if (error) throw error;

      setInactiveProducts((prev) => prev.filter((p) => p.id !== id));

      setProducts((prev) => [...prev, { ...prod, active: true }]);

      if (prod.tipo === "custom") {
        setCustomProducts((prev) => [...prev, { ...prod, active: true }]);
      }

      return { reactivado: true };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoadingFor(id, false);
    }
  };

  const buscarProductoPorId = (id) => {
    return products.find((prod) => prod.id === id);
  };

  const actualizarProductosPostVenta = (productosConStockActualizado) => {
    setProducts((prev) =>
      prev.map((prod) => {
        const encontrado = productosConStockActualizado.find(
          (p) => p.id_producto === prod.id
        );
        return encontrado ? { ...prod, stock: encontrado.stock } : prod;
      })
    );
  };

  useEffect(() => {
    if (loadingBrands) return;

    fetchProductos();
  }, [categoryId, subcategoryId, loadingBrands]);

  return {
    products,
    customProducts,
    inactiveProducts,
    loadingProductos,
    loadingProductsIndividual,
    reactivarProducto,
    error,
    crearCustomProduct,
    actualizarProducto,
    eliminarProducto,
    buscarProductoPorId,
    actualizarProductosPostVenta,
    refetch: fetchProductos,
  };
};
