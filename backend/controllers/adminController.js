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

const updateOrderQuantitiesAndApprove = async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body; // Array de items con nuevas cantidades

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Actualizar cantidades en LineasPedidoCliente
      for (const item of items) {
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('Orden', item.Orden)
          .input('UnidadesPedidas', item.UnidadesPedidas)
          .input('UnidadesPendientes', item.UnidadesPedidas)
          .input('Unidades2_', item.UnidadesPedidas)
          .input('UnidadesPendientesFabricar', item.UnidadesPedidas)
          .query(`
            UPDATE LineasPedidoCliente 
            SET 
              UnidadesPedidas = @UnidadesPedidas,
              UnidadesPendientes = @UnidadesPendientes,
              Unidades2_ = @Unidades2_,
              UnidadesPendientesFabricar = @UnidadesPendientesFabricar
            WHERE NumeroPedido = @NumeroPedido AND Orden = @Orden
          `);
      }

      // 2. Recalcular totales del pedido
      const totalesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            SUM(UnidadesPedidas * Precio) AS BaseImponible,
            SUM((UnidadesPedidas * Precio) * ([%Iva] / 100.0)) AS TotalIVA
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

      // 3. Actualizar cabecera con nuevos totales y estado
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('StatusAprobado', -1)
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET 
            BaseImponible = @BaseImponible,
            TotalIva = @TotalIVA,
            ImporteLiquido = @ImporteLiquido,
            StatusAprobado = @StatusAprobado
          WHERE NumeroPedido = @NumeroPedido
        `);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: 'Pedido actualizado y aprobado correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la actualización del pedido'
    });
  }
};

module.exports = {
  getPendingOrders,
  getOrderForReview,
  updateOrderQuantitiesAndApprove
};