import React, { useState } from "react";
import { useAppContext } from "../../../contexto/Context";

export function FormProducts() {
  const { agregarProducto } = useAppContext(); // Llamamos al hook para agregar el producto
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio_compra: "",
    precio_venta: "",
    stock: "",
    id_categoria: "",
    id_subcategoria: "",
  });
  const [error, setError] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false); // Estado para controlar la visibilidad del formulario

  const categorias = [
    { id: 1, nombre: "Almacén", subcategorias: [1, 2, 3, 4, 5] },
    { id: 2, nombre: "Verdulería", subcategorias: [6, 7, 8] },
    { id: 3, nombre: "Farmacia", subcategorias: [] },
    { id: 4, nombre: "Panadería", subcategorias: [] },
    { id: 5, nombre: "Otros", subcategorias: [] },
  ];

  const subcategorias = [
    { id: 1, categoriaId: 1, nombre: "Alimentos" },
    { id: 2, categoriaId: 1, nombre: "Bebidas" },
    { id: 3, categoriaId: 1, nombre: "Golosinas" },
    { id: 4, categoriaId: 1, nombre: "Snacks" },
    { id: 5, categoriaId: 1, nombre: "Limpieza" },
    { id: 6, categoriaId: 2, nombre: "Verduras" },
    { id: 7, categoriaId: 2, nombre: "Frutas" },
    { id: 8, categoriaId: 2, nombre: "Condimentos" },
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("SE QUIERE AGREGAR");

    // Validación de formulario, excluyendo descripción de ser obligatoria
    if (
      !formData.nombre ||
      !formData.precio_compra ||
      !formData.precio_venta ||
      !formData.stock ||
      !formData.id_categoria
    ) {
      setError("Todos los campos son obligatorios excepto la descripción.");
      return;
    }

    console.log("FormData antes de enviar:", formData); // Verifica que los datos estén correctos

    // Crear una copia del formData y convertir id_subcategoria a null si es una cadena vacía
    const dataToSend = {
      ...formData,
      id_subcategoria:
        formData.id_subcategoria === "" ? null : formData.id_subcategoria,
    };

    console.log("Data a enviar:", dataToSend); // Verifica que los datos sean correctos antes de enviarlos

    // Verificar si agregarProducto es la función esperada
    if (typeof agregarProducto === "function") {
      agregarProducto(dataToSend)
    } else {
      console.error(
        "La función agregarProducto no está definida correctamente."
      );
    }

    // Limpiar formulario
    setFormData({
      nombre: "",
      descripcion: "", // Permitir que esté vacío
      precio_compra: "",
      precio_venta: "",
      stock: "",
      id_categoria: "",
      id_subcategoria: "", // Mantener vacío en el formulario
    });
    setError("");
  };

  // Controlar la visibilidad del formulario
  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
  };

  return (
    <div className="p-1 border border-gray-300 rounded-lg shadow-lg">
      {/* Botón para mostrar/ocultar el formulario */}
      <div className="flex">
        <button
          onClick={toggleFormVisibility}
          className="cursor-pointer  px-6 py-2 bg-blue-500 text-white rounded-lg hover:text-black hover:bg-blue-200 transition duration-100"
        >
          {isFormVisible ? "Cerrar Formulario" : "Agregar Producto"}
        </button>
      </div>

      {/* Formulario con animación */}
      <div
        className={` transition-all duration-1500 ease-in-out ${
          isFormVisible
            ? "opacity-100  max-h-[1000px]" // Cuando está visible, usa un max-height grande
            : "opacity-0 scale-90 max-h-0" // Cuando está oculto, reduce max-height a 0
        } overflow-hidden`}
      >
        {isFormVisible && (
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-3">
            {error && <p className="text-red-500 text-center">{error}</p>}

            {/* Nombre del producto */}
            <div className="mb-4">
              <label
                htmlFor="nombre"
                className="block text-sm font-semibold text-gray-700"
              >
                Nombre
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                placeholder="Nombre del producto"
                required
              />
            </div>

            {/* Precio de compra */}
            <div className="mb-4">
              <label
                htmlFor="precio_compra"
                className="block text-sm font-semibold text-gray-700"
              >
                Precio de Compra
              </label>
              <input
                type="number"
                id="precio_compra"
                name="precio_compra"
                value={formData.precio_compra}
                onChange={handleChange}
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                placeholder="Precio de compra"
                required
              />
            </div>

            {/* Precio de venta */}
            <div className="mb-4">
              <label
                htmlFor="precio_venta"
                className="block text-sm font-semibold text-gray-700"
              >
                Precio de Venta
              </label>
              <input
                type="number"
                id="precio_venta"
                name="precio_venta"
                value={formData.precio_venta}
                onChange={handleChange}
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                placeholder="Precio de venta"
                required
              />
            </div>

            {/* Stock */}
            <div className="mb-4">
              <label
                htmlFor="stock"
                className="block text-sm font-semibold text-gray-700"
              >
                Stock
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                placeholder="Stock"
                required
              />
            </div>
            {/* Descripción del producto (no obligatorio) */}
            <div className="mb-4">
              <label
                htmlFor="descripcion"
                className="block text-sm font-semibold text-gray-700"
              >
                Descripción (opcional)
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                placeholder="Descripción del producto"
              />
            </div>

            {/* Categoría */}
            <div className="mb-4">
              <label
                htmlFor="id_categoria"
                className="block text-sm font-semibold text-gray-700"
              >
                Categoría
              </label>
              <select
                id="id_categoria"
                name="id_categoria"
                value={formData.id_categoria}
                onChange={handleChange}
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                required
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategoría */}
            {formData.id_categoria && (
              <div className="mb-4">
                <label
                  htmlFor="id_subcategoria"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Subcategoría
                </label>
                <select
                  id="id_subcategoria"
                  name="id_subcategoria"
                  value={formData.id_subcategoria}
                  onChange={handleChange}
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                >
                  <option value="">Seleccionar subcategoría</option>
                  {subcategorias
                    .filter(
                      (subcategoria) =>
                        subcategoria.categoriaId ===
                        parseInt(formData.id_categoria)
                    )
                    .map((subcategoria) => (
                      <option key={subcategoria.id} value={subcategoria.id}>
                        {subcategoria.nombre}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Botón para enviar */}
            <div className="text-center items-center flex">
              <button
                type="submit"
                className="mb-6 px-6 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
              >
                Agregar Producto
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
