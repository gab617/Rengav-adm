// Función para contar las cantidades de cada producto
export const contarProductos = (ventas) => {
  return ventas.reduce((acc, venta) => {
    venta.productos.forEach((producto) => {
      const nombreProducto = producto.producto.trim(); // Limpiar espacios al nombre del producto
      const cantidad = producto.cantidad;
      const total = parseFloat(producto.total);

      if (acc[nombreProducto]) {
        acc[nombreProducto].cantidad += cantidad; // Acumular las cantidades vendidas
        acc[nombreProducto].total += total; // Acumular el total vendido
      } else {
        acc[nombreProducto] = {
          producto: nombreProducto,
          cantidad: cantidad,
          precio_unitario: parseFloat(producto.precio_unitario),
          ganancia: producto.precio_unitario- producto.precio_compra,
          total: total,
        };
      }
    });
    return acc;
  }, {});
};

// Función para obtener el producto más vendido
export const obtenerProductoMasVendido = (ventas) => {
  const contadorProductos = contarProductos(ventas);

  // Encontrar el producto más vendido
  let productoMasVendido = null;
  let maxCantidad = 0;

  // Recorrer el contador para encontrar el producto con mayor cantidad
  for (const producto in contadorProductos) {
    if (contadorProductos[producto].cantidad > maxCantidad) {
      maxCantidad = contadorProductos[producto].cantidad;
      productoMasVendido = contadorProductos[producto];
    }
  }

  return productoMasVendido;
};
