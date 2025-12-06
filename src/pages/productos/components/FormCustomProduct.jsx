import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../services/supabaseClient";
import { useAppContext } from "../../../contexto/Context";
import { toast, ToastContainer } from "react-toastify";

export function FormCustomProduct({ userId }) {
  const { preferencias, categories, subcategories, crearCustomProduct } =
    useAppContext();
  const dark = preferencias?.theme === "dark";

  const [open, setOpen] = useState(false);

  // estados del formulario
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioCompra, setPrecioCompra] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [stock, setStock] = useState("");

  // subcategorías filtradas según categoría seleccionada
  const [subcategoriasFiltradas, setSubcategoriasFiltradas] = useState([]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategoriasFiltradas([]);
      return;
    }

    const filtradas = subcategories.filter(
      (s) => s.category_id === Number(categoryId)
    );

    setSubcategoriasFiltradas(filtradas);
  }, [categoryId, subcategories]);

  function resetForm() {
    setName("");
    setBrand("");
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
        brand,
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

            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Marca"
              className={inputClass}
            />

            {/* --- CATEGORÍA --- */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
                  {s.name}
                </option>
              ))}
            </select>

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
      <ToastContainer/>
    </div>
  );
}
