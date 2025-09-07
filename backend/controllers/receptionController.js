const { getPool } = require('../db/Sage200db');

const getOrderReception = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.RazonSocial,
          c.FechaPedido,
          c.Estado,
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.ComentarioRecepcion,
          l.FechaRecepcion
        FROM CabeceraPedidoCliente c
        JOIN LineasPedidoCliente l ON c.NumeroPedido = l.NumeroPedido
        WHERE c.NumeroPedido = @NumeroPedido
        ORDER BY l.Orden
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    // Organizar los datos
    const orderInfo = {
      NumeroPedido: result.recordset[0].NumeroPedido,
      RazonSocial: result.recordset[0].RazonSocial,
      FechaPedido: result.recordset[0].FechaPedido,
      Estado: result.recordset[0].Estado,
      Productos: result.recordset.map(item => ({
        Orden: item.Orden,
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        UnidadesPedidas: item.UnidadesPedidas,
        UnidadesRecibidas: item.UnidadesRecibidas,
        ComentarioRecepcion: item.ComentarioRecepcion,
        FechaRecepcion: item.FechaRecepcion
      }))
    };

    res.status(200).json({
      success: true,
      order: orderInfo
    });
  } catch (error) {
    console.error('Error al obtener datos de recepción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener datos de recepción',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const confirmReception = async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Actualizar cada línea del pedido
      for (const item of items) {
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('Orden', item.Orden)
          .input('UnidadesRecibidas', item.UnidadesRecibidas)
          .input('ComentarioRecepcion', item.ComentarioRecepcion || '')
          .input('FechaRecepcion', new Date())
          .query(`
            UPDATE LineasPedidoCliente 
            SET 
              UnidadesRecibidas = @UnidadesRecibidas,
              ComentarioRecepcion = @ComentarioRecepcion,
              FechaRecepcion = @FechaRecepcion
            WHERE NumeroPedido = @NumeroPedido AND Orden = @Orden
          `);
      }

      // Actualizar estado del pedido a Servido (2)
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('Estado', 2)
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET Estado = @Estado
          WHERE NumeroPedido = @NumeroPedido
        `);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: 'Recepción confirmada correctamente',
        estado: 2
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción de recepción:', err);
      
      let errorMessage = 'Error al procesar la transacción de recepción';
      if (err.number === 132) {
        errorMessage = 'Error de duplicación en la base de datos';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (error) {
    console.error('Error al confirmar recepción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar la recepción'
    });
  }
};

module.exports = {
  getOrderReception,
  confirmReception
};