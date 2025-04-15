const { pool } = require('../config/sage200db');

// Obtener historial de pedidos por cliente
exports.obtenerHistorial = async (req, res) => {
  const { CodigoCliente } = req.query;

  try {
    const result = await pool.request()
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
               FechaPedido, NumeroLineas, RazonSocial
        FROM CabeceraPedidoCliente
        WHERE CodigoCliente = @CodigoCliente
        ORDER BY FechaPedido DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener historial de pedidos:', err);
    res.status(500).json({ error: 'Error al obtener historial de pedidos' });
  }
};

// Obtener detalles de un pedido específico
exports.obtenerDetalles = async (req, res) => {
  const { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido } = req.query;

  try {
    const result = await pool.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioPedido', EjercicioPedido)
      .input('SeriePedido', SeriePedido)
      .input('NumeroPedido', NumeroPedido)
      .query(`
        SELECT l.CodigoArticulo, a.DescripcionArticulo, l.Cantidad, l.PrecioUnitario, l.FechaPedido
        FROM LineasPedidoCliente l
        LEFT JOIN Articulos a ON l.CodigoArticulo = a.CodigoArticulo
        WHERE l.CodigoEmpresa = @CodigoEmpresa
          AND l.EjercicioPedido = @EjercicioPedido
          AND l.SeriePedido = @SeriePedido
          AND l.NumeroPedido = @NumeroPedido
        ORDER BY l.Orden
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener detalles del pedido:', err);
    res.status(500).json({ error: 'Error al obtener detalles del pedido' });
  }
};
