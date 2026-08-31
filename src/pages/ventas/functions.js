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

/* =====================================================================
   HELPERS COMPARTIDOS DEL REPORTE DE VENTAS
   ---------------------------------------------------------------------
   Única fuente de verdad para los cálculos que se repiten entre el
   Dashboard (Ventas.jsx), el panel imprimible (PanelVentas.jsx) y las
   tarjetas de venta (LiVenta.jsx). Toman como entrada las ventas ya
   filtradas por período según la estructura real del hook:
   ventas[].user_sales_detail[] = {
     cantidad, precio_unitario, precio_compra, nombre_producto, ...
   }
   ===================================================================== */

// Total de unidades vendidas en una venta
export const sumarCantidadDetalles = (detalles = []) =>
  detalles.reduce((acc, d) => acc + Number(d.cantidad || 0), 0);

// Monto total de una venta (suma de precio_unitario * cantidad)
export const calcularMontoVenta = (venta = {}) =>
  (venta.user_sales_detail || []).reduce(
    (acc, d) => acc + Number(d.precio_unitario || 0) * Number(d.cantidad || 0),
    0
  );

// Ganancia de una venta (precio_venta - precio_compra) * cantidad
export const calcularGananciaVenta = (venta = {}) =>
  (venta.user_sales_detail || []).reduce(
    (acc, d) =>
      acc +
      (Number(d.precio_unitario || 0) - Number(d.precio_compra || 0)) *
        Number(d.cantidad || 0),
    0
  );

// Totales agregados del listado de ventas
export const calcularResumenVentas = (ventas = []) => {
  const totalVentas = ventas.length;
  const montoTotal = ventas.reduce((acc, v) => acc + calcularMontoVenta(v), 0);
  const ganancias = ventas.reduce(
    (acc, v) => acc + calcularGananciaVenta(v),
    0
  );
  const ticketPromedio = totalVentas > 0 ? montoTotal / totalVentas : 0;
  const unidadesVendidas = ventas.reduce(
    (acc, v) => acc + sumarCantidadDetalles(v.user_sales_detail),
    0
  );

  return {
    totalVentas,
    montoTotal,
    ganancias,
    ticketPromedio,
    unidadesVendidas,
    margenPorcentual: montoTotal > 0 ? (ganancias / montoTotal) * 100 : 0,
  };
};

// Agrupa los productos vendidos por nombre (+talle) y devuelve el detalle
// para ranking: cantidad, monto, ganancia total y stock actual (si llega).
export const agruparProductosVendidos = (ventas = []) => {
  const mapa = {};

  ventas.forEach((venta) => {
    (venta.user_sales_detail || []).forEach((d) => {
      const nombre = d.nombre_producto || "Sin nombre";
      const talle = d.talle || null;
      const key = talle ? `${nombre} | ${talle}` : nombre;

      const cantidad = Number(d.cantidad || 0);
      const precioUnitario = Number(d.precio_unitario || 0);
      const precioCompra = Number(d.precio_compra || 0);

      if (!mapa[key]) {
        mapa[key] = {
          key,
          nombre,
          talle: talle || null,
          product_id: d.product_id ?? null,
          cantidad,
          monto: precioUnitario * cantidad,
          ganancia: (precioUnitario - precioCompra) * cantidad,
          margenUnitario: precioUnitario - precioCompra,
          stock: null,
        };
      } else {
        mapa[key].cantidad += cantidad;
        mapa[key].monto += precioUnitario * cantidad;
        mapa[key].ganancia += (precioUnitario - precioCompra) * cantidad;
      }
    });
  });

  return Object.values(mapa);
};

// Ranking por cantidad vendida (unidades)
export const rankingPorCantidad = (ventas = [], top = 5) =>
  [...agruparProductosVendidos(ventas)]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, top);

// Ranking por ganancia total (rentabilidad)
export const rankingPorGanancia = (ventas = [], top = 5) =>
  [...agruparProductosVendidos(ventas)]
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, top);

// Toma el nombre base de un producto como aparece en el detalle
export const nombreProductoDetalle = (d = {}) =>
  d.nombre_producto || d.producto || "Sin nombre";
