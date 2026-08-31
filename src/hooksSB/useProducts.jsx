import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../services/supabaseClient";

const normalizarNombre = (texto) => {
  const limpio = String(texto || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!limpio) return limpio;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};

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
      "stock_talles",
      "proveedor_nombre",
      "base_id",
      "custom_id",
      "user_id",
      "active",
      "imagenes",
      "destacado",
      "visible",
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
            stock_talles,
            proveedor_nombre,
            active,
            imagenes,
            destacado,
            visible,
            products_base (
              id,
              name,
              brand_id,
              image_url,
              category_id,
              subcategory_id,
              type_unit,
              talles
            ),
            user_custom_products (
              id,
              name,
              brand_id,
              image_url,
              category_id,
              subcategory_id,
              brand_text,
              talles
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
          const custom = p.user_custom_products;

          if (!custom) {
            return {
              ...p,
              tipo: "custom",
              products_base: {
                id: null,
                name: "Producto (sin datos)",
                brand: null,
                image_url: null,
                category_id: null,
                subcategory_id: null,
                brand_text: null,
                talles: null,
                type_unit: null,
              },
            };
          }

          return {
            ...p,
            tipo: "custom",
            products_base: {
              id: custom.id,
              name: custom.name,
              brand: resolveBrandName(custom.brand_id),
              image_url: custom.image_url,
              category_id: custom.category_id,
              subcategory_id: custom.subcategory_id,
              brand_text: custom.brand_text,
              talles: custom.talles || [],
              type_unit: custom.type_unit || null,
            },
          };
        }

        const base = p.products_base;

        if (!base) {
          return {
            ...p,
            tipo: "base",
            products_base: {
              id: null,
              name: "Producto (sin datos)",
              brand: null,
              image_url: null,
              category_id: null,
              subcategory_id: null,
              brand_text: null,
              type_unit: null,
              talles: null,
            },
          };
        }

        return {
          ...p,
          tipo: "base",
          products_base: {
            id: base.id,
            name: base.name,
            brand: resolveBrandName(base.brand_id),
            image_url: base.image_url,
            category_id: base.category_id,
            subcategory_id: base.subcategory_id,
            brand_text: null,
            type_unit: base.type_unit,
            talles: base.talles || [],
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
    imagenes,
    tenantId,
    talles = [],
    unifiedBrands, // 👈 pasar o tomar del contexto
  }) => {
    setLoadingProductosFetch(true);

    const nombreFinal = normalizarNombre(name);

    try {
      if (!userId) {
        throw new Error(
          "No hay usuario logueado (userId vacío). Recargá la página."
        );
      }

      const { data: sesionDiag } = await supabase.auth.getSession();
      console.log("[crearCustomProduct] userId enviado:", userId);
      console.log(
        "[crearCustomProduct] sesion.user.id:",
        sesionDiag?.session?.user?.id ?? null
      );

      /* ----------------------------------
       1️⃣ CREAR PRODUCTO CUSTOM BASE
       Insert SIN .select(): PostgREST con return=representation
       aplica la SELECT policy a la fila devuelta, y durante un
       INSERT...RETURNING el subquery de custom_belongs_to_tenant
       no ve la fila recién insertada (MVCC) → 42501 + rollback.
    ---------------------------------- */
      const { error: err1 } = await supabase
        .from("user_custom_products")
        .insert([
          {
            user_id: userId,
            name: nombreFinal,
            brand_id: brandId || null,
            brand_text: brandText || null,
            category_id: categoryId,
            subcategory_id: subcategoryId || null,
            talles: talles.map(Number),
          },
        ]);

      if (err1) throw err1;

      /* 1.1️⃣ Recuperar el custom recién creado (request aparte:
         la fila ya está commiteada y la SELECT policy la ve). */
      const { data: customRow, error: errFetch } = await supabase
        .from("user_custom_products")
        .select(
          "id, name, brand_id, brand_text, category_id, subcategory_id, image_url, talles"
        )
        .eq("user_id", userId)
        .eq("name", nombreFinal)
        .order("id", { ascending: false })
        .limit(1);

      if (errFetch) throw errFetch;

      const customProd = customRow?.[0];
      if (!customProd?.id) {
        throw new Error("No se pudo recuperar el custom recién creado");
      }
      console.log("[crearCustomProduct] custom creado id:", customProd.id);

      /* ----------------------------------
        1.5️⃣ MOVER IMÁGENES PENDIENTES AL PRODUCTO
    ---------------------------------- */
      let imagenesFinales = [];
      if (imagenes?.length && tenantId) {
        const bucket = supabase.storage.from("product-images");
        for (const path of imagenes) {
          const fileName = path.split("/").pop();
          const nuevoPath = `${tenantId}/${customProd.id}/${fileName}`;
          const { error: errMove } = await bucket.move(path, nuevoPath);
          if (!errMove) {
            imagenesFinales.push(nuevoPath);
          } else {
            console.warn("No se pudo mover la imagen:", errMove.message);
          }
        }
      }

      /* ----------------------------------
        1.6️⃣ GUARDAR LA PRINCIPAL EN LA FICHA COMPARTIDA
        (user_custom_products.image_url) para que cualquier user
        del negocio al que se asigne el custom vea la imagen.
    ---------------------------------- */
      if (imagenesFinales.length) {
        console.log(
          "[crearCustomProduct] UPDATE image_url del custom",
          customProd.id
        );
        const { error: errImg } = await supabase
          .from("user_custom_products")
          .update({ image_url: imagenesFinales[0] })
          .eq("id", customProd.id);

        if (errImg) {
          console.warn(
            "No se pudo guardar la imagen de la ficha del custom:",
            errImg.message
          );
        } else {
          customProd.image_url = imagenesFinales[0];
        }
      }

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
            ...(imagenesFinales.length
              ? { imagenes: imagenesFinales }
              : {}),
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
        imagenes: imagenesFinales.length ? imagenesFinales : [],
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
      console.error(
        "[crearCustomProduct] code:",
        error.code,
        "| details:",
        error.details
      );
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

      const prevCustom = prev?.user_custom_products;
      const customImageUrl =
        producto.user_custom_products?.image_url ?? null;

      if (
        producto.tipo === "custom" &&
        producto.custom_id &&
        prevCustom
      ) {
        necesitaActualizarCustom =
          producto.nombre !== prevCustom.name ||
          (producto.brand ?? null) !==
            (prevCustom.brand ?? null) ||
          customImageUrl !==
            (prevCustom.image_url ?? null);
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
            image_url: customImageUrl,
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
                          customImageUrl ??
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
      const aEliminar = products.find((p) => p.id === id);
      const imagenesAEliminar = aEliminar?.imagenes || [];
      // Los customs comparten UN solo pool de archivos entre el molde
      // (user_custom_products.image_url) y todas las asignaciones. Si
      // es un custom, acá solo quitamos la asignación: las imágenes
      // quedan (las administra /admin/prods-base).
      const esCustom = aEliminar?.custom_id != null;

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

      if (!esCustom && imagenesAEliminar.length > 0) {
        const { error: errStorage } = await supabase
          .storage
          .from("product-images")
          .remove(imagenesAEliminar);

        if (errStorage) {
          console.warn(
            "No se pudieron limpiar las imágenes del storage:",
            errStorage.message
          );
        }
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
        const encontrados = productosConStockActualizado.filter(
          (p) => p.id_producto === prod.id
        );
        if (!encontrados.length) return prod;

        let actualizado = { ...prod };
        encontrados.forEach((e) => {
          actualizado = {
            ...actualizado,
            stock: e.stock,
          };

          if (e.talle && actualizado.stock_talles) {
            actualizado.stock_talles = {
              ...actualizado.stock_talles,
              [e.talle]: Math.max(
                (Number(actualizado.stock_talles[e.talle]) || 0) -
                  Number(e.cantidad),
                0
              ),
            };
          }
        });

        return actualizado;
      })
    );
  };

  // Agregar producto base al estado (cuando se agrega desde productos del sistema)
  const agregarProductoBase = (productoNormalizado) => {
    setProducts((prev) => [...prev, productoNormalizado]);
  };

  useEffect(() => {
    if (loadingBrands) return;

    fetchProductos();
  }, [categoryId, subcategoryId, loadingBrands]);

  const syncProductFromAdmin = (id, updates) => {
    const applyUpdates = (list) =>
      list.map((p) =>
        p.id === id
          ? {
              ...p,
              stock: updates.stock ?? p.stock,
              stock_talles: updates.stock_talles ?? p.stock_talles,
              precio_venta: updates.precio_venta ?? p.precio_venta,
              precio_compra: updates.precio_compra ?? p.precio_compra,
              active: updates.active ?? p.active,
              descripcion: updates.descripcion ?? p.descripcion,
              imagenes: updates.imagenes ?? p.imagenes,
            }
          : p
      );

    setProducts(applyUpdates);
    setCustomProducts(applyUpdates);
    setInactiveProducts(applyUpdates);
  };

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
    agregarProductoBase,
    syncProductFromAdmin,
    refetch: fetchProductos,
  };
};
