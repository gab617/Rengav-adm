import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../services/supabaseClient";
import { useProfile } from "../../../hooksSB/useProfile";

export function useAdminProductsBase(onProductCreated, tenantId) {
  const { profile } = useProfile();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [adminCategoryIds, setAdminCategoryIds] = useState([]);
  const [tieneCatalogoDefinido, setTieneCatalogoDefinido] = useState(false);
  const [baseGallery, setBaseGallery] = useState({});
  const [tenantGallery, setTenantGallery] = useState({});

  const loadProducts = useCallback(async () => {
    setLoading(true);

    let adminCatIds = [];

    if (profile?.id) {
      const { data: userCats } = await supabase
        .from("user_categories")
        .select("category_id")
        .eq("user_id", profile.id)
        .eq("active", true);

      adminCatIds = userCats?.map(uc => uc.category_id) || [];
      setAdminCategoryIds(adminCatIds);
      setTieneCatalogoDefinido(adminCatIds.length > 0);
    }

    let relatedUsers = [];
    
    if (profile?.id && (profile.role === "admin" || profile.role === "super_admin")) {
      if (profile.role === "super_admin") {
        const { data: allUsers } = await supabase.from("profiles").select("id");
        relatedUsers = allUsers?.map(u => u.id) || [];
      } else if (profile.tenant_id) {
        const { data: tenantUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("tenant_id", profile.tenant_id);
        relatedUsers = tenantUsers?.map(u => u.id) || [];
      }
    }

    const { data: productsData, error } = await supabase
      .from("products_base")
      .select(`
        id,
        name,
        type_unit,
        brand_id,
        category_id,
        subcategory_id,
        image_url,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .order("name");

    let productsWithFlags = productsData || [];
    const galleryMap = {};

    if (relatedUsers.length > 0) {
      const { data: userProducts } = await supabase
        .from("user_products")
        .select("base_id, imagenes")
        .in("user_id", relatedUsers);

      const usedBaseIds = new Set(userProducts?.map(up => up.base_id).filter(id => id !== null) || []);

      userProducts?.forEach((up) => {
        if (!up.base_id) return;
        if (!galleryMap[up.base_id]) galleryMap[up.base_id] = [];
        (up.imagenes || []).forEach((p) => {
          if (p && !galleryMap[up.base_id].includes(p)) {
            galleryMap[up.base_id].push(p);
          }
        });
      });

      productsWithFlags = (productsData || []).map(p => ({
        ...p,
        enUso: usedBaseIds.has(p.id),
        enCatalogo: adminCatIds.includes(p.category_id),
      }));
    } else {
      productsWithFlags = (productsData || []).map(p => ({
        ...p,
        enUso: false,
        enCatalogo: adminCatIds.includes(p.category_id),
      }));
    }

    (productsData || []).forEach((p) => {
      if (p.image_url && !p.image_url.startsWith("http")) {
        galleryMap[p.id] = [
          p.image_url,
          ...(galleryMap[p.id] || []).filter((x) => x !== p.image_url),
        ];
      }
    });
    setBaseGallery(galleryMap);

    if (!error) setProducts(productsWithFlags);
    setLoading(false);
  }, [profile?.id, profile?.role, profile?.tenant_id]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadTenantGallery = useCallback(async () => {
    if (!tenantId) {
      setTenantGallery({});
      return;
    }

    const { data: tenantUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenantId);

    const tenantUserIds = tenantUsers?.map((u) => u.id) || [];

    if (!tenantUserIds.length) {
      setTenantGallery({});
      return;
    }

    const { data: tenantProducts } = await supabase
      .from("user_products")
      .select("base_id, imagenes")
      .in("user_id", tenantUserIds);

    const map = {};

    tenantProducts?.forEach((up) => {
      if (!up.base_id) return;
      if (!map[up.base_id]) map[up.base_id] = [];
      (up.imagenes || []).forEach((p) => {
        if (p && !map[up.base_id].includes(p)) {
          map[up.base_id].push(p);
        }
      });
    });

    setTenantGallery(map);
  }, [tenantId]);

  useEffect(() => {
    loadTenantGallery();
  }, [loadTenantGallery]);

  const createProductBase = useCallback(async ({
    name,
    brand_id,
    category_id,
    subcategory_id,
    type_unit = "unit",
    imageFile,
  }) => {
    if (profile?.role !== "super_admin") {
      throw new Error("Solo el super admin puede crear productos base");
    }

    if (!name || !category_id) {
      throw new Error("Faltan campos obligatorios");
    }

    setCreating(true);

    const { data: inserted, error } = await supabase
      .from("products_base")
      .insert([
        {
          name,
          brand_id: brand_id || null,
          category_id,
          subcategory_id,
          type_unit,
        },
      ])
      .select(`
        id,
        name,
        type_unit,
        brand_id,
        category_id,
        subcategory_id,
        image_url,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .single();

    if (error) {
      setCreating(false);
      throw error;
    }

    let data = inserted;

    if (imageFile) {
      const path = `base/${inserted.id}/${Date.now()}-${imageFile.name.replace(/[^\w.-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile, { contentType: imageFile.type });

      if (uploadErr) {
        await supabase.from("products_base").delete().eq("id", inserted.id);
        setCreating(false);
        throw uploadErr;
      }

      const { data: updated, error: imgErr } = await supabase
        .from("products_base")
        .update({ image_url: path })
        .eq("id", inserted.id)
        .select(`
          id,
          name,
          type_unit,
          brand_id,
          category_id,
          subcategory_id,
          image_url,
          brands ( id, name ),
          categories ( id, name ),
          subcategories ( id, name )
        `)
        .single();

      if (imgErr) {
        setCreating(false);
        throw imgErr;
      }

      data = updated;
    }

    setCreating(false);

    const newProduct = {
      ...data,
      enUso: false,
      enCatalogo: adminCategoryIds.includes(data.category_id),
    };

    setProducts((prev) =>
      [...prev, newProduct].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );

    if (data.image_url && !data.image_url.startsWith("http")) {
      setBaseGallery((prev) => ({
        ...prev,
        [data.id]: [data.image_url],
      }));
    }

    if (onProductCreated) {
      onProductCreated();
    }
  }, [onProductCreated, adminCategoryIds, profile?.role]);

  const updateProductBaseImage = useCallback(async (productId, imageUrl) => {
    if (profile?.role !== "super_admin") {
      throw new Error("Solo el super admin puede modificar el catálogo global");
    }

    const { error } = await supabase
      .from("products_base")
      .update({ image_url: imageUrl })
      .eq("id", productId);

    if (error) throw error;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, image_url: imageUrl } : p))
    );

    if (onProductCreated) {
      onProductCreated();
    }
  }, [onProductCreated, profile?.role]);

  const updateProductBase = useCallback(async ({
    id,
    name,
    category_id,
    subcategory_id,
    brand_id,
    type_unit,
    newImageFile,
    removeImage,
  }) => {
    if (profile?.role !== "super_admin") {
      throw new Error("Solo el super admin puede modificar el catálogo global");
    }

    const actual = products.find((p) => p.id === id);

    let image_url;
    if (newImageFile) {
      const path = `base/${id}/${Date.now()}-${newImageFile.name.replace(/[^\w.-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, newImageFile, { contentType: newImageFile.type });
      if (uploadErr) throw uploadErr;
      image_url = path;
    } else if (removeImage) {
      image_url = null;
    }

    const payload = {
      name,
      category_id: Number(category_id),
      subcategory_id: subcategory_id ? Number(subcategory_id) : null,
      brand_id: brand_id ? Number(brand_id) : null,
      type_unit,
    };
    if (image_url !== undefined) payload.image_url = image_url;

    const { data, error } = await supabase
      .from("products_base")
      .update(payload)
      .eq("id", id)
      .select(`
        id,
        name,
        type_unit,
        brand_id,
        category_id,
        subcategory_id,
        image_url,
        brands ( id, name ),
        categories ( id, name ),
        subcategories ( id, name )
      `)
      .single();

    if (error) throw error;

    if (
      image_url !== undefined &&
      actual?.image_url &&
      actual.image_url !== image_url &&
      actual.image_url.startsWith("base/")
    ) {
      await supabase.storage.from("product-images").remove([actual.image_url]);
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...data,
              enUso: p.enUso ?? false,
              enCatalogo: adminCategoryIds.includes(data.category_id),
            }
          : p
      )
    );

    if (image_url !== undefined) {
      setBaseGallery((prev) => {
        const next = { ...prev };
        if (removeImage) {
          next[id] = (next[id] || []).filter((x) => x !== actual?.image_url);
        } else if (image_url) {
          next[id] = [
            image_url,
            ...(next[id] || []).filter((x) => x !== image_url),
          ];
        }
        return next;
      });
    }

    if (onProductCreated) {
      onProductCreated();
    }
  }, [onProductCreated, profile?.role, products, adminCategoryIds]);

  return {
    products,
    loading,
    creating,
    createProductBase,
    updateProductBaseImage,
    updateProductBase,
    adminCategoryIds,
    tieneCatalogoDefinido,
    baseGallery,
    tenantGallery,
  };
}