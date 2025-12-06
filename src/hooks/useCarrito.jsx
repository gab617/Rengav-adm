import React, { useState, useEffect } from "react";

export function useCarrito() {
  const [carrito, setCarrito] = useState([]);

  // Guardar carrito en localStorage
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  // === AGREGAR AL CARRITO ===
  const agregarProductoCarrito = (producto, color) => {
    if (producto.stock <= 0) return;

    setCarrito((prevCarrito) => {
      const existente = prevCarrito.find(
        (item) => item.id === producto.id   // ← ahora usamos id real
      );

      if (existente) {
        // Evita pasar el stock disponible
        if (existente.cantidad >= producto.stock) return prevCarrito;

        return prevCarrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      // Producto nuevo
      return [...prevCarrito, { ...producto, cantidad: 1, color }];
    });
  };

  // === ELIMINAR DEL CARRITO ===
  const eliminarProductoCarrito = (id_producto) => {
    setCarrito((prevCarrito) =>
      prevCarrito.filter((item) => item.id !== id_producto) // ← ahora id
    );
  };

  // === ACTUALIZAR CANTIDAD ===
  const actualizarCantidad = (id_producto, cantidad) => {
    console.log("mas o menos",id_producto)
    setCarrito((prevCarrito) =>
      prevCarrito.map((item) => {
        if (item.id === id_producto) {

          // Si se reduce, permitir siempre
          if (cantidad < item.cantidad) return { ...item, cantidad };

          // Si se aumenta, verificar stock
          if (cantidad <= item.stock) return { ...item, cantidad };

          return item; // no cambiar si supera stock
        }
        return item;
      })
    );
  };

  // === LIMPIAR CARRITO ===
  const limpiarCarrito = () => {
    setCarrito([]);
  };

  // === TOTAL ===
  const calcularTotal = () => {
    return carrito.reduce(
      (total, item) => total + item.precio_venta * item.cantidad,
      0
    );
  };

  return {
    carrito,
    agregarProductoCarrito,
    eliminarProductoCarrito,
    actualizarCantidad,
    limpiarCarrito,
    calcularTotal,
  };
}
