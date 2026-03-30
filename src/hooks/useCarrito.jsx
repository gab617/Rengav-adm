import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

export function useCarrito() {
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const stockEnCarrito = (productoId) => {
    return carrito
      .filter((item) => item.id === productoId)
      .reduce((acc, item) => acc + Number(item.cantidad), 0);
  };

  const agregarProductoCarrito = (producto, color, extra = {}) => {
    setCarrito((prevCarrito) => {
      const esPeso = producto.products_base?.type_unit === "weight";
      const stockOriginal = Number(producto.stock);
      const stockReservado = stockEnCarrito(producto.id);
      const stockDisponible = stockOriginal - stockReservado;

      if (esPeso && extra.peso) {
        const pesoNuevo = Number(extra.peso);
        const pesoEnCarrito = prevCarrito
          .filter((item) => item.id === producto.id)
          .reduce((acc, item) => acc + Number(item.cantidad), 0);

        const pesoTotal = pesoEnCarrito + pesoNuevo;

        if (pesoTotal > stockDisponible) {
          toast.warning(`⚠️ Stock insuficiente. Disponible: ${stockDisponible.toFixed(3)} kg`);
          return prevCarrito;
        }

        const existente = prevCarrito.find((item) => item.id === producto.id);

        if (existente) {
          return prevCarrito.map((item) =>
            item.id === producto.id
              ? { ...item, cantidad: pesoTotal }
              : item
          );
        }

        return [
          ...prevCarrito,
          {
            ...producto,
            cantidad: pesoNuevo,
            color,
          },
        ];
      }

      const existente = prevCarrito.find((item) => item.id === producto.id);

      if (existente) {
        if (stockDisponible <= 0) {
          toast.warning("⚠️ Stock insuficiente.");
          return prevCarrito;
        }

        return prevCarrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      if (stockDisponible <= 0) {
        toast.warning("⚠️ Stock insuficiente.");
        return prevCarrito;
      }

      return [
        ...prevCarrito,
        {
          ...producto,
          cantidad: 1,
          color,
        },
      ];
    });
  };

  const eliminarProductoCarrito = (id_producto) => {
    setCarrito((prevCarrito) =>
      prevCarrito.filter((item) => item.id !== id_producto)
    );
  };

  const actualizarCantidad = (id_producto, cantidad) => {
    if (cantidad < 0) return;

    setCarrito((prevCarrito) => {
      const itemIndex = prevCarrito.findIndex((item) => item.id === id_producto);
      if (itemIndex === -1) return prevCarrito;

      const item = prevCarrito[itemIndex];
      const stockOriginal = Number(item.stock);
      const cantidadActual = item.cantidad;

      const stockReservadoSinEsteItem = prevCarrito
        .filter((i) => i.id === id_producto && i !== item)
        .reduce((acc, i) => acc + Number(i.cantidad), 0);

      const stockDisponible = stockOriginal - stockReservadoSinEsteItem;

      if (cantidad > stockDisponible) return prevCarrito;

      return prevCarrito.map((i) =>
        i.id === id_producto ? { ...i, cantidad } : i
      );
    });
  };

  const limpiarCarrito = () => {
    setCarrito([]);
  };

  const actualizarStockEnCarrito = (actualizaciones) => {
    setCarrito((prevCarrito) =>
      prevCarrito.map((item) => {
        const actualizacion = actualizaciones.find((a) => a.id_producto === item.id);
        if (actualizacion) {
          return { ...item, stock: actualizacion.stock };
        }
        return item;
      })
    );
  };

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
    stockEnCarrito,
    actualizarStockEnCarrito,
  };
}
