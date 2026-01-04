import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../services/supabaseClient";
import { useAppContext } from "../../../contexto/Context";
import { toast, ToastContainer } from "react-toastify";

export function FormCustomProduct({ userId }) {
  const {
    brands,
    preferencias,
    categorias,
    subcategorias,
    crearCustomProduct,
    loadingBrands,
    unifiedBrands,
  } = useAppContext();
  const dark = preferencias?.theme === "dark";
  console.log(unifiedBrands);

  const [open, setOpen] = useState(false);

  // estados del formulario
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");

  const [brandId, setBrandId] = useState(null);
  const [selectedBrandKey, setSelectedBrandKey] = useState("");

  const [brandInput, setBrandInput] = useState("");
  const [brandsFiltradas, setBrandsFiltradas] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioCompra, setPrecioCompra] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [stock, setStock] = useState("");

  // subcategorías filtradas según categoría seleccionada
  const [subcategoriasFiltradas, setSubcategoriasFiltradas] = useState([]);

  const marcasPorCategoria = useMemo(() => {
    if (!categoryId) return [];

    return unifiedBrands.filter((b) =>
      b.category_ids.includes(Number(categoryId))
    );
  }, [unifiedBrands, categoryId]);

  const brandSuggestions = useMemo(() => {
    if (!brandInput || !categoryId) return [];

    return marcasPorCategoria.filter((b) =>
      b.label.toLowerCase().includes(brandInput.toLowerCase())
    );
  }, [brandInput, marcasPorCategoria]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategoriasFiltradas([]);
      return;
    }

    const filtradas = subcategorias.filter(
      (s) => s.id_categoria === Number(categoryId)
    );

    setSubcategoriasFiltradas(filtradas);
  }, [categoryId, subcategorias]);

  useEffect(() => {
    if (!categoryId) {
      setBrandsFiltradas([]);
      setBrandId("");
      return;
    }

    const filtradas = brands.filter((b) =>
      b.category_ids.includes(Number(categoryId))
    );

    setBrandsFiltradas(filtradas);
  }, [categoryId, brands]);

  function resetForm() {
    setName("");
    setBrandId(null);
    setBrandInput("");
    setCategoryId("");
    setSubcategoryId("");
    setDescripcion("");
    setPrecioCompra("");
    setPrecioVenta("");
    setProveedor("");
    setStock("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name || !categoryId || !precioCompra || !precioVenta || stock === "") {
      toast.error("⚠️ Faltan datos obligatorios", {
        position: "top-center",
        autoClose: 2500,
      });
      return;
    }

    try {
      await crearCustomProduct({
        name,
        brandId: brandId || null,
        brandText: brandId ? null : brandInput?.trim() || null,
        categoryId,
        subcategoryId,
        descripcion,
        precioCompra,
        precioVenta,
        proveedor,
        stock,
        userId,
      });

      toast.success("✨ Producto creado con éxito", {
        position: "top-center",
        autoClose: 2300,
      });

      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error("❌ Hubo un error al crear el producto", {
        position: "top-center",
        autoClose: 2500,
      });
    }
  }

  // estilos
  const inputClass = dark
    ? "border p-2 rounded w-full bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400"
    : "border p-2 rounded w-full bg-white text-gray-900 border-gray-300 placeholder-gray-500";

  const formBg = dark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900";
  const buttonPrimary =
    "bg-green-500 text-white hover:bg-green-600 transition rounded p-2 w-full";
  const toggleBtn = dark
    ? "bg-blue-700 text-white hover:bg-blue-800 transition rounded px-4 py-2 mb-2"
    : "bg-blue-600 text-white hover:bg-blue-700 transition rounded px-4 py-2 mb-2";

  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} className={toggleBtn}>
        {open ? "Cerrar Formulario" : "Nuevo Producto Personalizado"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className={`space-y-3 p-4 rounded shadow-md overflow-hidden ${formBg}`}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del producto"
              className={inputClass}
            />

            {/* --- CATEGORÍA --- */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {/* --- SUBCATEGORÍA --- */}
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className={inputClass}
              disabled={!categoryId}
            >
              <option value="">Seleccionar subcategoría</option>
              {subcategoriasFiltradas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>

            <select
              value={selectedBrandKey}
              onChange={(e) => {
                const key = e.target.value;
                setSelectedBrandKey(key);

                const selected = unifiedBrands.find((b) => b.key === key);

                if (!selected) return;

                if (selected.type === "system") {
                  setBrandId(selected.brand_id);
                  setBrandInput(selected.label);
                } else {
                  setBrandId(null);
                  setBrandInput(selected.brand_text);
                }
              }}
              className={inputClass}
              disabled={!categoryId}
            >
              <option value="">Seleccionar marca</option>

              {marcasPorCategoria.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                  {b.type === "text" ? " (personalizada)" : ""}
                </option>
              ))}
            </select>

            <div className="relative">
              {brandInput && !brandId && (
                <p className="text-sm text-gray-500">
                  Se creará una nueva marca si no existe
                </p>
              )}

              {brandId && (
                <p className="text-sm text-green-600">
                  Marca existente seleccionada
                </p>
              )}

              <input
                value={brandInput}
                onChange={(e) => {
                  setBrandInput(e.target.value);
                  setBrandId(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Marca"
                className={inputClass}
                disabled={!categoryId}
              />

              {showSuggestions && brandSuggestions.length > 0 && (
                <ul
                  className={`absolute z-20 w-full border rounded mt-1 max-h-40 overflow-auto ${
                    dark
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {brandSuggestions.map((b) => (
                    <li
                      key={b.id}
                      onClick={() => {
                        setSelectedBrandKey(b.key);

                        if (b.type === "system") {
                          setBrandId(b.brand_id);
                          setBrandInput(b.label);
                        } else {
                          setBrandId(null);
                          setBrandInput(b.brand_text);
                        }

                        setShowSuggestions(false);
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-500 hover:text-white"
                    >
                      {b.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción (opcional)"
              className={inputClass}
            />

            <input
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              placeholder="Precio compra"
              type="number"
              step="0.01"
              className={inputClass}
            />

            <input
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder="Precio venta"
              type="number"
              step="0.01"
              className={inputClass}
            />

            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Stock inicial"
              type="number"
              step="1"
              className={inputClass}
            />

            <input
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Proveedor (opcional)"
              className={inputClass}
            />

            <button className={buttonPrimary}>Crear Producto</button>
          </motion.form>
        )}
      </AnimatePresence>
      <ToastContainer />
    </div>
  );
}
