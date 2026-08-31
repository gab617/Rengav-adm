import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { stockDelTalle } from "../utils/talles";

// Identidad de una línea de carrito: (id del user_product + talle).
// Un producto con talles puede tener varias líneas (una por talle).
const itemKey = (id, talle) => `${id}|${talle || ""}`;

export function useCarrito() {
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const stockEnCarrito = (productoId, talle) => {
    const key = itemKey(productoId, talle);
    return carrito
      .filter((item) => itemKey(item.id, item.talle) === key)
      .reduce((acc, item) => acc + Number(item.cantidad), 0);
  };

  const agregarProductoCarrito = (producto, color, extra = {}) => {
    const nombreProducto =
      producto.tipo === "custom"
        ? producto.user_custom_products?.name
        : producto.products_base?.name || "Producto";

    setCarrito((prevCarrito) => {
      const esPeso = producto.products_base?.type_unit === "weight";
      const talle = extra.talle || null;
      const cantidad = Math.max(1, Number(extra.cantidad) || 1);
      const stockTalle = stockDelTalle(producto, talle);
      const stockReservado = stockEnCarrito(producto.id, talle);
      const stockDisponible = stockTalle - stockReservado;
      const msgStock = talle
        ? `⚠️ Stock insuficiente para el talle ${talle}. Disponible: ${stockDisponible}`
        : `⚠️ Stock insuficiente. Disponible: ${stockDisponible}`;
      const msgExito = `✅ ${nombreProducto}${talle ? ` (${talle})` : ""}${
        cantidad > 1 ? ` x${cantidad}` : ""
      } agregado al carrito`;

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
          toast.success(`✅ ${pesoNuevo.toFixed(3)} kg de ${nombreProducto} agregado`);
          return prevCarrito.map((item) =>
            item.id === producto.id
              ? { ...item, cantidad: pesoTotal }
              : item
          );
        }

        toast.success(`✅ ${pesoNuevo.toFixed(3)} kg de ${nombreProducto} agregado`);
        return [
          ...prevCarrito,
          {
            ...producto,
            cantidad: pesoNuevo,
            talle: null,
            color,
          },
        ];
      }

      const key = itemKey(producto.id, talle);
      const existente = prevCarrito.find(
        (item) => itemKey(item.id, item.talle) === key
      );

      if (existente) {
        if (stockDisponible <= 0) {
          toast.warning(msgStock);
          return prevCarrito;
        }
        if (cantidad > stockDisponible) {
          toast.warning(msgStock);
          return prevCarrito;
        }

        toast.success(msgExito);
        return prevCarrito.map((item) =>
          itemKey(item.id, item.talle) === key
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }

      if (stockDisponible <= 0) {
        toast.warning(msgStock);
        return prevCarrito;
      }
      if (cantidad > stockDisponible) {
        toast.warning(msgStock);
        return prevCarrito;
      }

      toast.success(msgExito);
      return [
        ...prevCarrito,
        {
          ...producto,
          cantidad,
          talle,
          color,
        },
      ];
    });
  };

  // Sin `talle` elimina TODAS las líneas del producto; con `talle`
  // elimina solo esa línea (ese talle).
  const eliminarProductoCarrito = (id_producto, talle) => {
    setCarrito((prevCarrito) =>
      prevCarrito.filter((item) => {
        if (talle === undefined) return item.id !== id_producto;
        return itemKey(item.id, item.talle) !== itemKey(id_producto, talle);
      })
    );
  };

  const actualizarCantidad = (id_producto, cantidad, talle) => {
    if (cantidad < 0) return;

    setCarrito((prevCarrito) => {
      const key = itemKey(id_producto, talle);
      const itemIndex = prevCarrito.findIndex(
        (item) => itemKey(item.id, item.talle) === key
      );
      if (itemIndex === -1) return prevCarrito;

      const item = prevCarrito[itemIndex];
      const stockTalle = stockDelTalle(item, item.talle);
      const stockReservadoSinEsteItem = prevCarrito
        .filter(
          (i) => i.id === id_producto && i.talle === item.talle && i !== item
        )
        .reduce((acc, i) => acc + Number(i.cantidad), 0);

      const stockDisponible = stockTalle - stockReservadoSinEsteItem;

      if (cantidad > stockDisponible) return prevCarrito;

      return prevCarrito.map((i) =>
        i.id === id_producto && i.talle === item.talle ? { ...i, cantidad } : i
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
          return {
            ...item,
            stock: actualizacion.stock,
            stock_talles:
              actualizacion.stock_talles ?? item.stock_talles,
          };
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
