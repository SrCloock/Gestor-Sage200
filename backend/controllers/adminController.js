const { getPool } = require('../db/Sage200db');

const getPendingOrders = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        NumeroPedido,
        FechaPedido,
        RazonSocial,
        CifDni,
        NumeroLineas,
        StatusAprobado,
        SeriePedido,
        BaseImponible,
        FechaNecesaria,
        ObservacionesPedido,
        CodigoCliente
      FROM CabeceraPedidoCliente
      WHERE SeriePedido = 'Web' AND StatusAprobado = 0
      ORDER BY FechaPedido DESC
    `);

    console.log('Pedidos pendientes encontrados:', result.recordset.length);

    res.status(200).json({
      success: true,
      orders: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener pedidos pendientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getOrderForReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = await getPool();

    const orderResult = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          c.CifDni,
          c.Domicilio,
          c.CodigoPostal,
          c.Municipio,
          c.Provincia,
          c.StatusAprobado,
          c.ObservacionesPedido,
          c.FechaNecesaria
        FROM CabeceraPedidoCliente c
        WHERE c.NumeroPedido = @NumeroPedido
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    const linesResult = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.Precio,
          l.CodigoProveedor,
          p.RazonSocial as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
        WHERE l.NumeroPedido = @NumeroPedido
        ORDER BY l.Orden
      `);

    // Eliminar posibles duplicados
    const uniqueProducts = [];
    const seenKeys = new Set();
    
    linesResult.recordset.forEach(item => {
      const key = `${item.Orden}-${item.CodigoArticulo}-${item.CodigoProveedor || 'no-prov'}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueProducts.push(item);
      }
    });

    res.status(200).json({
      success: true,
      order: {
        ...orderResult.recordset[0],
        Productos: uniqueProducts
      }
    });
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


module.exports = {
  getPendingOrders,
  getOrderForReview
};