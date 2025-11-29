const { getPool } = require('../db/Sage200db');
const { generarAlbaranProveedorAutomatico } = require('./purchaseDeliveryController');

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

    const uniqueProducts = [];
    const seenKeys = new Set();
    
    result.recordset.forEach(item => {
      const key = `${item.Orden}-${item.CodigoArticulo}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueProducts.push(item);
      }
    });

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
      for (const item of items) {
        if (item.UnidadesRecibidas !== item.UnidadesPedidas && !item.ComentarioRecepcion) {
          throw new Error(`Debe agregar un comentario para el artículo ${item.CodigoArticulo} ya que la cantidad recibida difiere de la pedida`);
        }
      }

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
      if (totalRecibido === 0) {
        nuevoEstado = 0;
      } else if (totalPendiente === 0) {
        nuevoEstado = 2;
      } else {
        nuevoEstado = 1;
      }

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

      let albaranesCompraGenerados = [];
      const esRecepcionParcial = totalPendiente > 0;
      const itemsRecepcionados = items.filter(item => 
        (parseInt(item.UnidadesRecibidas) || 0) > 0
      );

      if (itemsRecepcionados.length > 0) {
        try {
          albaranesCompraGenerados = await generarAlbaranProveedorAutomatico(
            transaction, 
            orderInfo, 
            itemsRecepcionados, 
            orderInfo.CodigoEmpresa,
            esRecepcionParcial
          );

          for (const albaranInfo of albaranesCompraGenerados) {
            if (albaranInfo.NumeroPedidoProveedor) {
              const pedidoProveedorResult = await transaction.request()
                .input('NumeroPedido', albaranInfo.NumeroPedidoProveedor)
                .input('SeriePedido', 'WebCD')
                .input('CodigoEmpresa', orderInfo.CodigoEmpresa)
                .query(`
                  SELECT 
                    SUM(l.UnidadesPedidas) as TotalPedido,
                    SUM(l.UnidadesRecibidas) as TotalRecibido,
                    SUM(l.UnidadesPendientes) as TotalPendiente,
                    c.Estado
                  FROM LineasPedidoProveedor l
                  INNER JOIN CabeceraPedidoProveedor c ON 
                    l.NumeroPedido = c.NumeroPedido AND 
                    l.SeriePedido = c.SeriePedido AND
                    l.CodigoEmpresa = c.CodigoEmpresa
                  WHERE l.NumeroPedido = @NumeroPedido
                  AND l.SeriePedido = @SeriePedido
                  AND l.CodigoEmpresa = @CodigoEmpresa
                  GROUP BY c.Estado
                `);

              if (pedidoProveedorResult.recordset.length > 0) {
                const pedidoProveedor = pedidoProveedorResult.recordset[0];
                const totalPendienteProveedor = pedidoProveedor.TotalPendiente || 0;
                const estadoActualProveedor = pedidoProveedor.Estado || 0;

                if (totalPendienteProveedor === 0 && estadoActualProveedor !== 2) {
                  await transaction.request()
                    .input('NumeroPedido', albaranInfo.NumeroPedidoProveedor)
                    .input('SeriePedido', 'WebCD')
                    .input('CodigoEmpresa', orderInfo.CodigoEmpresa)
                    .input('Estado', 2)
                    .query(`
                      UPDATE CabeceraPedidoProveedor 
                      SET Estado = @Estado
                      WHERE NumeroPedido = @NumeroPedido
                      AND SeriePedido = @SeriePedido
                      AND CodigoEmpresa = @CodigoEmpresa
                    `);

                  await transaction.request()
                    .input('NumeroPedido', albaranInfo.NumeroPedidoProveedor)
                    .input('SeriePedido', 'WebCD')
                    .input('CodigoEmpresa', orderInfo.CodigoEmpresa)
                    .query(`
                      UPDATE LineasPedidoProveedor 
                      SET 
                        UnidadesRecibidas = UnidadesPedidas,
                        UnidadesPendientes = 0
                      WHERE NumeroPedido = @NumeroPedido
                      AND SeriePedido = @SeriePedido
                      AND CodigoEmpresa = @CodigoEmpresa
                    `);
                }
              }
            }
          }
        } catch (error) {
        }
      }

      await transaction.commit();

      const nuevos = albaranesCompraGenerados.filter(a => a.esNuevo).length;
      const actualizados = albaranesCompraGenerados.filter(a => !a.esNuevo).length;
      
      const response = {
        success: true,
        message: `Recepción confirmada correctamente. ${nuevos} albarán(es) nuevo(s) creado(s), ${actualizados} actualizado(s).`,
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
        resumen: {
          nuevos: nuevos,
          actualizados: actualizados
        }
      };

      res.status(200).json(response);

    } catch (err) {
      await transaction.rollback();
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al confirmar la recepción',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al confirmar la recepción',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const finalizeOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
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

      if (pedido.Estado === 2) {
        throw new Error('El pedido ya está marcado como servido');
      }

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

      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .input('Estado', 2)
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET Estado = @Estado
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

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
        
        await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .query(`
            UPDATE LineasAlbaranCliente 
            SET 
              Unidades = UnidadesServidas,
              UnidadesServidas = UnidadesServidas
            WHERE NumeroAlbaran = @NumeroAlbaran
          `);

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
      }

      const itemsPendientesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            Orden,
            CodigoArticulo,
            DescripcionArticulo,
            UnidadesPedidas as UnidadesRecibidas,
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
        try {
          albaranesFinalizacionGenerados = await generarAlbaranProveedorAutomatico(
            transaction, 
            {
              EjercicioPedido: pedido.EjercicioPedido,
              SeriePedido: 'WebCD',
              NumeroPedido: orderId,
              CodigoEmpresa: pedido.CodigoEmpresa
            }, 
            itemsPendientesResult.recordset, 
            pedido.CodigoEmpresa,
            true
          );
        } catch (error) {
        }
      }

      await transaction.commit();

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
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al finalizar el pedido'
      });
    }
  } catch (error) {
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