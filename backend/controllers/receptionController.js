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
          c.StatusAprobado,
          c.FechaNecesaria,
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.UnidadesPendientes,
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
      StatusAprobado: result.recordset[0].StatusAprobado,
      Productos: uniqueProducts.map(item => ({
        Orden: item.Orden,
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        UnidadesPedidas: item.UnidadesPedidas,
        UnidadesRecibidas: item.UnidadesRecibidas,
        UnidadesPendientes: item.UnidadesPendientes,
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
      // 1. Validar que si hay cambios en cantidades, haya comentarios
      for (const item of items) {
        if (item.UnidadesRecibidas !== item.UnidadesPedidas && !item.ComentarioRecepcion) {
          throw new Error(`Debe agregar un comentario para el artículo ${item.CodigoArticulo} ya que la cantidad recibida difiere de la pedida`);
        }
      }

      // 2. Obtener información completa del pedido
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            CodigoEmpresa, 
            EjercicioPedido,
            CodigoCliente,
            RazonSocial,
            Domicilio,
            CodigoPostal,
            Municipio,
            Provincia,
            Estado,
            StatusAprobado
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderInfo = orderResult.recordset[0];

      // 3. Actualizar líneas del pedido con cantidades recibidas y calcular pendientes
      for (const item of items) {
        const unidadesRecibidas = parseInt(item.UnidadesRecibidas) || 0;
        const unidadesPedidas = parseInt(item.UnidadesPedidas) || 0;
        const unidadesPendientes = unidadesPedidas - unidadesRecibidas;
        
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .input('Orden', item.Orden)
          .input('UnidadesRecibidas', unidadesRecibidas)
          .input('UnidadesPendientes', unidadesPendientes)
          .input('UnidadesServidas', unidadesRecibidas) // Actualizar unidades servidas
          .input('ComentarioRecepcion', item.ComentarioRecepcion || '')
          .input('FechaRecepcion', new Date())
          .query(`
            UPDATE LineasPedidoCliente 
            SET 
              UnidadesRecibidas = @UnidadesRecibidas,
              UnidadesPendientes = @UnidadesPendientes,
              UnidadesServidas = @UnidadesServidas,
              ComentarioRecepcion = @ComentarioRecepcion,
              FechaRecepcion = @FechaRecepcion
            WHERE NumeroPedido = @NumeroPedido 
            AND SeriePedido = @SeriePedido 
            AND Orden = @Orden
          `);
      }

      // 4. Buscar el albarán de cliente asociado al pedido
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
        
        console.log(`Encontrado albarán ${numeroAlbaran} para el pedido ${orderId}`);
        
        // 5. Actualizar las líneas del albarán de cliente con las unidades recibidas
        for (const item of items) {
          const unidadesRecibidas = parseInt(item.UnidadesRecibidas) || 0;
          
          await transaction.request()
            .input('NumeroAlbaran', numeroAlbaran)
            .input('Orden', item.Orden)
            .input('Unidades', unidadesRecibidas)
            .input('UnidadesServidas', unidadesRecibidas)
            .input('ComentarioRecepcion', item.ComentarioRecepcion || '')
            .query(`
              UPDATE LineasAlbaranCliente 
              SET 
                Unidades = @Unidades, 
                UnidadesServidas = @UnidadesServidas,
                ComentarioRecepcion = @ComentarioRecepcion
              WHERE NumeroAlbaran = @NumeroAlbaran AND Orden = @Orden
            `);
        }

        // 6. Recalcular los totales del albarán de cliente con las nuevas cantidades
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

        // 7. Actualizar la cabecera del albarán con los nuevos totales
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

        console.log(`Albarán ${numeroAlbaran} actualizado con nuevas cantidades y comentarios`);
      } else {
        console.warn(`No se encontró albarán para el pedido ${orderId}`);
      }

      // 8. Calcular el NUEVO ESTADO del pedido basado en las unidades recibidas
      const estadoResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            SUM(UnidadesPedidas) as TotalPedido,
            SUM(UnidadesRecibidas) as TotalRecibido,
            SUM(UnidadesPendientes) as TotalPendiente
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      const totalPedido = estadoResult.recordset[0].TotalPedido || 0;
      const totalRecibido = estadoResult.recordset[0].TotalRecibido || 0;
      const totalPendiente = estadoResult.recordset[0].TotalPendiente || 0;

      let nuevoEstado;
      
      // LÓGICA CORREGIDA para determinar el estado
      if (totalRecibido === 0) {
        nuevoEstado = 0; // No se ha recibido nada -> Preparando
      } else if (totalPendiente === 0) {
        nuevoEstado = 2; // No hay unidades pendientes -> Servido
      } else {
        nuevoEstado = 1; // Hay unidades pendientes pero se recibió algo -> Parcial
      }

      console.log(`Estado calculado: Pedido=${totalPedido}, Recibido=${totalRecibido}, Pendiente=${totalPendiente} -> Estado=${nuevoEstado}`);

      // 9. Actualizar estado del pedido en la cabecera
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
        message: 'Recepción confirmada correctamente. Albarán actualizado con las cantidades recibidas y comentarios.',
        estado: nuevoEstado,
        estadoTexto: nuevoEstado === 2 ? 'Servido' : nuevoEstado === 1 ? 'Parcial' : 'Preparando',
        totales: {
          pedido: totalPedido,
          recibido: totalRecibido,
          pendiente: totalPendiente
        }
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción de recepción:', err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al confirmar la recepción',
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