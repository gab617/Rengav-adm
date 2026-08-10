import React, { useState, useMemo } from "react";
import { supabase } from "../../../../services/supabaseClient";
import { useAuth } from "../../../../contexto/AuthContext";
import { useAppContext } from "../../../../contexto/Context";
import { ProductImagesEditor } from "../../../usuario/components/ProductImagesEditor";

export function AdminCustomProductForm({ products, categories, subcategories, onAgregado }) {
  const { user } = useAuth();
  const { profile, preferencias, unifiedBrands, crearCustomProduct, agregarProductoBase } =
    useAppContext();
  const dark = preferencias?.theme === "dark";

  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [forzarPropio, setForzarPropio] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [precioCompra, setPrecioCompra] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [stock, setStock] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenes, setImagenes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const userId = user?.id;
  const tenantId = profile?.tenant_id;

  const handleNameChange = (value) => {
    setName(value);
    if (value.trim().length >= 2) {
      const lower = value.toLowerCase();
      const found = products
        .filter((p) => p.name?.toLowerCase().includes(lower))
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brands?.name,
          cat: p.categories?.name,
        }));
      setSuggestions(found);
    } else {
      setSuggestions([]);
    }
  };

  const baseMatch = useMemo(() => {
    if (forzarPropio || !name.trim()) return null;
    return (
      products.find(
        (p) => p.name?.toLowerCase() === name.trim().toLowerCase()
      ) || null
    );
  }, [name, products, forzarPropio]);

  const elegirSugerencia = (s) => {
    setName(s.name);
    setForzarPropio(false);
    setSuggestions([]);
  };

  const subcategoriasDeCategoria = useMemo(() => {
    if (!categoryId) return [];
    return subcategories.filter(
      (s) => String(s.category_id) === String(categoryId)
    );
  }, [categoryId, subcategories]);

  const marcasDeCategoria = useMemo(() => {
    if (!categoryId) return [];
    return unifiedBrands.filter((b) =>
      b.category_ids.includes(Number(categoryId))
    );
  }, [categoryId, unifiedBrands]);

  const limpiar = () => {
    setName("");
    setSuggestions([]);
    setForzarPropio(false);
    setCategoryId("");
    setSubcategoryId("");
    setBrandInput("");
    setPrecioCompra("");
    setPrecioVenta("");
    setStock("");
    setDescripcion("");
    setImagenes([]);
  };

  async function moverImagenes(upId) {
    if (!imagenes.length || !tenantId) return [];
    const bucket = supabase.storage.from("product-images");
    const movidos = [];
    for (const path of imagenes) {
      const fileName = path.split("/").pop();
      const nuevoPath = `${tenantId}/${upId}/${fileName}`;
      const { error } = await bucket.move(path, nuevoPath);
      if (!error) movidos.push(nuevoPath);
    }
    if (movidos.length) {
      await supabase.from("user_products").update({ imagenes: movidos }).eq("id", upId);
    }
    return movidos;
  }

  async function asignarBaseExistente() {
    const base = baseMatch;
    if (!base) return;

    setSubmitting(true);
    try {
      const { data: up, error } = await supabase
        .from("user_products")
        .insert({
          user_id: userId,
          base_id: base.id,
          precio_compra: Number(precioCompra) || 0,
          precio_venta: Number(precioVenta) || 0,
          stock: Number(stock) || 0,
          descripcion: descripcion || null,
          active: true,
        })
        .select(
          "id, user_id, base_id, precio_compra, precio_venta, stock, descripcion, active, imagenes"
        )
        .single();

      if (error) throw error;

      const imagenesFinales = await moverImagenes(up.id);

      agregarProductoBase({
        ...up,
        imagenes: imagenesFinales,
        tipo: "base",
        products_base: {
          id: base.id,
          name: base.name,
          brand: base.brands?.name || null,
          image_url: base.image_url,
          category_id: base.category_id,
          subcategory_id: base.subcategory_id,
          type_unit: base.type_unit,
        },
      });

      alert(`✅ "${base.name}" asignado a tu negocio`);
      limpiar();
      onAgregado?.();
    } catch (err) {
      console.error(err);
      alert(err.message || "Error al asignar el producto");
    } finally {
      setSubmitting(false);
    }
  }

  async function crearProductoPropio() {
    if (!name.trim() || !categoryId) {
      alert("Faltan datos obligatorios (nombre y categoría)");
      return;
    }

    setSubmitting(true);
    try {
      const marcaEnCatalogo = marcasDeCategoria.find(
        (b) => b.label?.toLowerCase() === brandInput.trim().toLowerCase()
      );

      await crearCustomProduct({
        name: name.trim(),
        brandId: marcaEnCatalogo?.brand_id ?? null,
        brandText: marcaEnCatalogo
          ? null
          : brandInput?.trim() || null,
        categoryId,
        subcategoryId: subcategoryId || null,
        descripcion,
        precioCompra,
        precioVenta,
        proveedor: null,
        stock,
        userId,
        imagenes,
        tenantId,
      });

      alert(`✅ "${name.trim()}" creado como producto propio`);
      limpiar();
      onAgregado?.();
    } catch (err) {
      console.error(err);
      alert(err.message || "Error al crear el producto");
    } finally {
      setSubmitting(false);
    }
  }

  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const bgCard = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const inputBg = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-white text-gray-900 border-gray-300";
  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (baseMatch) {
          asignarBaseExistente();
        } else {
          crearProductoPropio();
        }
      }}
      className={`space-y-4 p-4 rounded-xl border ${bgCard}`}
    >
      <h2 className={`font-semibold text-lg ${textPrimary}`}>
        {baseMatch ? "🔁 Producto existente en el catálogo" : "➕ Crear producto"}
      </h2>

      {/* NOMBRE CON AUTOSUGERENCIAS */}
      <div className="relative">
        <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
          Nombre del producto
        </label>
        <input
          type="text"
          placeholder="Escribí el nombre, se filtra contra el catálogo global..."
          className={inputClass}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          required
        />

        {suggestions.length > 0 && (
          <div
            className={`absolute z-50 w-full mt-1 rounded-lg border shadow-lg ${
              dark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
            }`}
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => elegirSugerencia(s)}
                className={`w-full px-3 py-2 text-left text-sm flex justify-between items-center ${
                  dark ? "hover:bg-gray-600" : "hover:bg-gray-50"
                } ${textPrimary}`}
              >
                <span>{s.name}</span>
                <span className={`text-xs ${textSecondary}`}>
                  {s.brand || ""} {s.brand && s.cat ? "•" : ""} {s.cat || ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BANNER PRODUCTO EXISTENTE */}
      {baseMatch && (
        <div
          className={`p-3 rounded-lg border ${
            dark
              ? "border-blue-500/40 bg-blue-500/10"
              : "border-blue-300 bg-blue-50"
          }`}
        >
          <p className={`text-sm font-medium ${textPrimary}`}>
            ⚡ Ya existe en el catálogo global: <b>{baseMatch.name}</b>
            {baseMatch.brands?.name && ` (${baseMatch.brands.name})`}
          </p>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            Se lo vas a asignar a tu negocio y personalizar. Si no es lo que
            buscás, podés{" "}
            <button
              type="button"
              onClick={() => setForzarPropio(true)}
              className="underline text-blue-500"
            >
              crear uno propio con este nombre
            </button>
            .
          </p>
        </div>
      )}

      {/* SOLO CUANDO SE CREA PROPIO */}
      {!baseMatch && (
        <>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
              setBrandInput("");
            }}
            className={inputClass}
            required
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className={`${inputClass} ${!categoryId ? "opacity-50" : ""}`}
            disabled={!categoryId}
          >
            <option value="">
              {categoryId ? "Seleccionar subcategoría" : "Elegir categoría primero"}
            </option>
            {subcategoriasDeCategoria.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div>
            <input
              list="marcas-custom-admin"
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              placeholder="Marca (opcional)"
              className={inputClass}
              disabled={!categoryId}
            />
            <datalist id="marcas-custom-admin">
              {marcasDeCategoria.map((b) => (
                <option key={b.key} value={b.label} />
              ))}
            </datalist>
            <p className={`text-[10px] mt-1 ${textSecondary}`}>
              Si la marca no está en el catálogo, se crea como marca propia.
            </p>
          </div>
        </>
      )}

      {/* PRECIOS / STOCK */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
            Precio compra
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0"
            className={inputClass}
            value={precioCompra}
            onChange={(e) => setPrecioCompra(e.target.value)}
          />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
            Precio venta
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0"
            className={inputClass}
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
          Stock inicial
        </label>
        <input
          type="number"
          step="1"
          placeholder="0"
          className={inputClass}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </div>

      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        className={`${inputClass} resize-none`}
        rows={2}
      />

      <div
        className={`p-3 rounded-xl border ${
          dark ? "border-gray-600 bg-gray-900/50" : "border-gray-200 bg-gray-50"
        }`}
      >
        <ProductImagesEditor
          tenantId={tenantId}
          productId="pending"
          imagenes={imagenes}
          onImagenesChange={setImagenes}
          dark={dark}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
      >
        {submitting
          ? "..."
          : baseMatch
            ? "🔁 Asignar a mi negocio"
            : "✅ Crear como producto propio"}
      </button>
    </form>
  );
}
