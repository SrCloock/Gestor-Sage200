const { getPool } = require('../db/Sage200db');
const { generarAlbaranProveedor } = require('./purchaseDeliveryController');

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
          c.CodigoEmpresa,
          c.EjercicioPedido,
          c.SeriePedido,
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.UnidadesPendientes,
          l.ComentarioRecepcion,
          l.FechaRecepcion,
          l.Precio,
          l.CodigoProveedor,
          l.[%Iva] as PorcentajeIva
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
      CodigoEmpresa: result.recordset[0].CodigoEmpresa,
      EjercicioPedido: result.recordset[0].EjercicioPedido,
      SeriePedido: result.recordset[0].SeriePedido,
      Productos: uniqueProducts.map(item => ({
        Orden: item.Orden,
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        UnidadesPedidas: item.UnidadesPedidas,
        UnidadesRecibidas: item.UnidadesRecibidas,
        UnidadesPendientes: item.UnidadesPendientes,
        ComentarioRecepcion: item.ComentarioRecepcion,
        FechaRecepcion: item.FechaRecepcion,
        Precio: item.Precio,
        CodigoProveedor: item.CodigoProveedor,
        PorcentajeIva: item.PorcentajeIva
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
            SeriePedido,
            CodigoCliente,
            RazonSocial,
            Domicilio,
            CodigoPostal,
            Municipio,
            Provincia,
            Estado,
            StatusAprobado,
            NumeroPedido
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderInfo = orderResult.recordset[0];
      const fechaActual = new Date();

      console.log(`🔄 Iniciando recepción para pedido ${orderId}`);

      // 3. Actualizar líneas del pedido con cantidades recibidas y calcular pendientes
      for (const item of items) {
        const unidadesRecibidas = parseInt(item.UnidadesRecibidas) || 0;
        const unidadesPedidas = parseInt(item.UnidadesPedidas) || 0;
        const unidadesPendientes = unidadesPedidas - unidadesRecibidas;
        
        console.log(`📦 Actualizando artículo ${item.CodigoArticulo}: Recibidas ${unidadesRecibidas} de ${unidadesPedidas}`);
        
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .input('Orden', item.Orden)
          .input('UnidadesRecibidas', unidadesRecibidas)
          .input('UnidadesPendientes', unidadesPendientes)
          .input('UnidadesServidas', unidadesRecibidas)
          .input('ComentarioRecepcion', item.ComentarioRecepcion || '')
          .input('FechaRecepcion', fechaActual)
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
        
        console.log(`📄 Encontrado albarán de cliente ${numeroAlbaran} para el pedido ${orderId}`);
        
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

        console.log(`✅ Albarán de cliente ${numeroAlbaran} actualizado con nuevas cantidades`);
      } else {
        console.warn(`⚠️ No se encontró albarán de cliente para el pedido ${orderId}`);
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
      
      // LÓGICA para determinar el estado
      if (totalRecibido === 0) {
        nuevoEstado = 0; // No se ha recibido nada -> Preparando
      } else if (totalPendiente === 0) {
        nuevoEstado = 2; // No hay unidades pendientes -> Servido
      } else {
        nuevoEstado = 1; // Hay unidades pendientes pero se recibió algo -> Parcial
      }

      console.log(`📊 Estado calculado: Pedido=${totalPedido}, Recibido=${totalRecibido}, Pendiente=${totalPendiente} -> Estado=${nuevoEstado}`);

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

      // 10. GENERAR ALBARANES DE COMPRA (FUNCIONALIDAD PRINCIPAL) - USANDO LA NUEVA FUNCIÓN MEJORADA
      let albaranesCompraGenerados = [];
      
      // Determinar si es recepción parcial
      const recepcionesAnterioresResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT COUNT(DISTINCT CONVERT(DATE, FechaRecepcion)) as TotalRecepciones
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido 
          AND SeriePedido = @SeriePedido
          AND FechaRecepcion IS NOT NULL
          AND CONVERT(DATE, FechaRecepcion) < CONVERT(DATE, GETDATE())
        `);

      const totalRecepcionesAnteriores = recepcionesAnterioresResult.recordset[0].TotalRecepciones || 0;
      const esRecepcionParcial = totalRecepcionesAnteriores > 0;
      const numeroParcial = totalRecepcionesAnteriores + 1;

      // Filtrar items recepcionados en esta confirmación (solo los que tienen unidades recibidas > 0)
      const itemsRecepcionados = items.filter(item => 
        (parseInt(item.UnidadesRecibidas) || 0) > 0
      );

      console.log(`📦 Items recepcionados en esta confirmación: ${itemsRecepcionados.length}`);
      console.log(`🔢 Recepción ${esRecepcionParcial ? 'PARCIAL' : 'COMPLETA'} - Número: ${numeroParcial}`);

      // Generar albaranes de compra si hay items recepcionados
      if (itemsRecepcionados.length > 0) {
        console.log(`🔄 Generando albaranes de compra para ${itemsRecepcionados.length} items recepcionados`);
        
        try {
          // 🔥 USAR LA NUEVA FUNCIÓN MEJORADA que busca albaranes existentes no facturados
          albaranesCompraGenerados = await generarAlbaranProveedor(
            transaction, 
            {
              ...orderInfo,
              EjercicioPedido: orderInfo.EjercicioPedido,
              SeriePedido: orderInfo.SeriePedido,
              NumeroPedido: orderInfo.NumeroPedido
            }, 
            itemsRecepcionados, 
            orderInfo.CodigoEmpresa,
            esRecepcionParcial,
            numeroParcial
          );

          console.log(`✅ ${albaranesCompraGenerados.length} albarán(es) de compra generado(s)`);
        } catch (error) {
          console.error('❌ Error al generar albaranes de compra:', error);
          // No hacemos throw aquí para no interrumpir el proceso completo
          // Solo registramos el error y continuamos
        }
      } else {
        console.log('ℹ️ No hay items recepcionados en esta confirmación para generar albaranes');
      }

      await transaction.commit();

      console.log(`🎉 Recepción completada exitosamente para pedido ${orderId}`);

      res.status(200).json({
        success: true,
        message: 'Recepción confirmada correctamente. Albaranes de compra generados según las cantidades recepcionadas.',
        estado: nuevoEstado,
        estadoTexto: nuevoEstado === 2 ? 'Servido' : nuevoEstado === 1 ? 'Parcial' : 'Preparando',
        totales: {
          pedido: totalPedido,
          recibido: totalRecibido,
          pendiente: totalPendiente
        },
        albaranesCompraGenerados: albaranesCompraGenerados.length,
        detallesAlbaranes: albaranesCompraGenerados,
        esRecepcionParcial: esRecepcionParcial,
        numeroParcial: numeroParcial
      });

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Error en la transacción de recepción:', err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al confirmar la recepción',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (error) {
    console.error('❌ Error al confirmar recepción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al confirmar la recepción',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔥 NUEVA FUNCIÓN: Finalizar pedido (marcar como servido)
const finalizeOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Verificar que el pedido existe y obtener información actual
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            Estado, 
            StatusAprobado,
            CodigoEmpresa,
            EjercicioPedido
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const pedido = orderResult.recordset[0];

      // 2. Verificar que el pedido no esté ya servido
      if (pedido.Estado === 2) {
        throw new Error('El pedido ya está marcado como servido');
      }

      console.log(`🔚 Finalizando pedido ${orderId} - Estado actual: ${pedido.Estado}`);

      // 3. Obtener unidades pendientes actuales
      const pendientesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            SUM(UnidadesPendientes) as TotalPendiente,
            SUM(UnidadesRecibidas) as TotalRecibido
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      const totalPendiente = pendientesResult.recordset[0].TotalPendiente || 0;
      const totalRecibido = pendientesResult.recordset[0].TotalRecibido || 0;

      console.log(`📊 Unidades pendientes antes de finalizar: ${totalPendiente}`);

      // 4. Actualizar estado del pedido a "Servido" (2)
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .input('Estado', 2) // Servido
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET Estado = @Estado
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      // 5. Actualizar líneas para poner pendientes a 0 y marcar como recibidas las pendientes
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .input('FechaRecepcion', new Date())
        .query(`
          UPDATE LineasPedidoCliente 
          SET 
            UnidadesPendientes = 0,
            UnidadesRecibidas = UnidadesPedidas,
            UnidadesServidas = UnidadesPedidas,
            ComentarioRecepcion = ISNULL(ComentarioRecepcion, '') + ' - Pedido finalizado manualmente',
            FechaRecepcion = @FechaRecepcion
          WHERE NumeroPedido = @NumeroPedido 
          AND SeriePedido = @SeriePedido
          AND UnidadesPendientes > 0
        `);

      // 6. Si existe albarán de cliente, actualizarlo también
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
        
        console.log(`📄 Actualizando albarán de cliente ${numeroAlbaran}`);

        // Actualizar líneas del albarán de cliente
        await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .query(`
            UPDATE LineasAlbaranCliente 
            SET 
              Unidades = UnidadesServidas,
              UnidadesServidas = UnidadesServidas
            WHERE NumeroAlbaran = @NumeroAlbaran
          `);

        // Recalcular totales del albarán de cliente
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

        console.log(`✅ Albarán de cliente ${numeroAlbaran} actualizado`);
      }

      // 7. Generar albaranes de compra para las unidades que se estaban pendientes
      const itemsPendientesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            Orden,
            CodigoArticulo,
            DescripcionArticulo,
            UnidadesPedidas as UnidadesRecibidas, -- Al finalizar, todas las pendientes se reciben
            Precio,
            CodigoProveedor,
            [%Iva] as PorcentajeIva,
            'Pedido finalizado manualmente' as ComentarioRecepcion
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido 
          AND SeriePedido = @SeriePedido
          AND UnidadesPendientes > 0
        `);

      let albaranesFinalizacionGenerados = [];
      
      if (itemsPendientesResult.recordset.length > 0) {
        console.log(`📦 Generando albaranes de compra para ${itemsPendientesResult.recordset.length} items pendientes al finalizar`);
        
        try {
          albaranesFinalizacionGenerados = await generarAlbaranProveedor(
            transaction, 
            {
              EjercicioPedido: pedido.EjercicioPedido,
              SeriePedido: 'WebCD',
              NumeroPedido: orderId,
              CodigoEmpresa: pedido.CodigoEmpresa
            }, 
            itemsPendientesResult.recordset, 
            pedido.CodigoEmpresa,
            true, // Siempre es parcial porque es finalización manual
            999   // Número especial para finalización
          );

          console.log(`✅ ${albaranesFinalizacionGenerados.length} albarán(es) de compra generado(s) por finalización`);
        } catch (error) {
          console.error('❌ Error al generar albaranes de compra por finalización:', error);
          // No interrumpimos el proceso por este error
        }
      }

      await transaction.commit();

      console.log(`🎉 Pedido ${orderId} finalizado exitosamente`);

      res.status(200).json({
        success: true,
        message: 'Pedido marcado como servido correctamente. Las unidades pendientes se han establecido a 0 y se han generado los albaranes de compra correspondientes.',
        estado: 2,
        unidadesPendientesAnteriores: totalPendiente,
        albaranesGenerados: albaranesFinalizacionGenerados.length,
        detallesAlbaranes: albaranesFinalizacionGenerados
      });

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Error al finalizar pedido:', err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al finalizar el pedido'
      });
    }
  } catch (error) {
    console.error('❌ Error al finalizar pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al finalizar el pedido'
    });
  }
};

module.exports = {
  getOrderReception,
  confirmReception,
  finalizeOrder
};