const { getPool } = require('../db/Sage200db');

const getOrderReception = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('NumeroPedido', orderId)
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT 
          c.NumeroPedido,
          c.RazonSocial,
          c.FechaPedido,
          c.Estado,
          c.FechaNecesaria,
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.ComentarioRecepcion,
          l.FechaRecepcion
        FROM CabeceraPedidoCliente c
        JOIN LineasPedidoCliente l ON c.NumeroPedido = l.NumeroPedido AND c.SeriePedido = l.SeriePedido
        WHERE c.NumeroPedido = @NumeroPedido
        AND c.SeriePedido = @SeriePedido
        ORDER BY l.Orden
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    // Eliminar duplicados
    const uniqueProducts = [];
    const seenKeys = new Set();
    
    result.recordset.forEach(item => {
      const key = `${item.Orden}-${item.CodigoArticulo}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueProducts.push(item);
      }
    });

    // Organizar los datos
    const orderInfo = {
      NumeroPedido: result.recordset[0].NumeroPedido,
      RazonSocial: result.recordset[0].RazonSocial,
      FechaPedido: result.recordset[0].FechaPedido,
      FechaNecesaria: result.recordset[0].FechaNecesaria,
      Estado: result.recordset[0].Estado,
      Productos: uniqueProducts.map(item => ({
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

// Función auxiliar para recalcular totales del albarán
const recalculateAlbaranTotals = async (transaction, numeroAlbaran) => {
  const totalesResult = await transaction.request()
    .input('NumeroAlbaran', numeroAlbaran)
    .query(`
      SELECT 
        SUM(Unidades * Precio) AS BaseImponible,
        SUM((Unidades * Precio) * ([%Iva] / 100.0)) AS TotalIVA
      FROM LineasAlbaranCliente
      WHERE NumeroAlbaran = @NumeroAlbaran
    `);

  const baseImponible = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
  const totalIVA = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
  const importeLiquido = baseImponible + totalIVA;

  await transaction.request()
    .input('NumeroAlbaran', numeroAlbaran)
    .input('BaseImponible', baseImponible)
    .input('TotalIVA', totalIVA)
    .input('ImporteLiquido', importeLiquido)
    .query(`
      UPDATE CabeceraAlbaranCliente
      SET 
        BaseImponible = @BaseImponible,
        TotalIVA = @TotalIVA,
        ImporteLiquido = @ImporteLiquido
      WHERE NumeroAlbaran = @NumeroAlbaran
    `);
};

const confirmReception = async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Actualizar líneas del pedido
      for (const item of items) {
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
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
            WHERE NumeroPedido = @NumeroPedido 
            AND SeriePedido = @SeriePedido 
            AND Orden = @Orden
          `);
      }

      // 2. Actualizar albarán de cliente (SOLO albarán de cliente)
      const albaranResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT NumeroAlbaran 
          FROM CabeceraAlbaranCliente 
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      if (albaranResult.recordset.length > 0) {
        const numeroAlbaran = albaranResult.recordset[0].NumeroAlbaran;
        
        // Actualizar líneas del albarán con unidades recibidas
        for (const item of items) {
          await transaction.request()
            .input('NumeroAlbaran', numeroAlbaran)
            .input('Orden', item.Orden)
            .input('Unidades', item.UnidadesRecibidas)
            .query(`
              UPDATE LineasAlbaranCliente 
              SET Unidades = @Unidades 
              WHERE NumeroAlbaran = @NumeroAlbaran AND Orden = @Orden
            `);
        }

        // Recalcular totales del albarán
        await recalculateAlbaranTotals(transaction, numeroAlbaran);
      }

      // 3. Determinar nuevo estado del pedido
      const pendingResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT SUM(UnidadesPedidas - UnidadesRecibidas) as Pendiente
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      const pendiente = pendingResult.recordset[0].Pendiente || 0;
      const nuevoEstado = pendiente > 0 ? 1 : 2; // 1=Parcial, 2=Servido

      // 4. Actualizar estado del pedido
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .input('Estado', nuevoEstado)
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET Estado = @Estado
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: 'Recepción confirmada correctamente',
        estado: nuevoEstado,
        estadoTexto: nuevoEstado === 1 ? 'Parcial' : 'Servido'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción de recepción:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error al confirmar la recepción',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (error) {
    console.error('Error al confirmar recepción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al confirmar la recepción',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getOrderReception,
  confirmReception
};