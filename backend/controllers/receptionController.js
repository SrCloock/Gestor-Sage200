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
          c.EsParcial,
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
          l.[%Iva] as PorcentajeIva,
          l.GrupoIva
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
    const seenArticuloOrden = new Set();
    
    result.recordset.forEach(item => {
      const key = `${item.Orden}-${item.CodigoArticulo}`;
      const articuloOrdenKey = `${item.CodigoArticulo}-${item.Orden}`;
      
      if (!seenKeys.has(key) && !seenArticuloOrden.has(articuloOrdenKey)) {
        seenKeys.add(key);
        seenArticuloOrden.add(articuloOrdenKey);
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
      EsParcial: result.recordset[0].EsParcial,
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
        PorcentajeIva: item.PorcentajeIva,
        GrupoIva: item.GrupoIva
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
      // Obtener información completa del pedido
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            c.CodigoEmpresa, 
            c.EjercicioPedido,
            c.SeriePedido,
            c.CodigoCliente,
            c.RazonSocial,
            c.Estado,
            c.StatusAprobado,
            c.NumeroPedido,
            c.EsParcial,
            l.Orden,
            l.CodigoArticulo,
            l.DescripcionArticulo,
            l.UnidadesPedidas,
            l.UnidadesRecibidas as UnidadesRecibidasActuales,
            l.UnidadesPendientes,
            l.Precio,
            l.CodigoProveedor,
            l.[%Iva] as PorcentajeIva,
            l.GrupoIva
          FROM CabeceraPedidoCliente c
          JOIN LineasPedidoCliente l ON c.NumeroPedido = l.NumeroPedido AND c.SeriePedido = l.SeriePedido
          WHERE c.NumeroPedido = @NumeroPedido AND c.SeriePedido = @SeriePedido
          ORDER BY l.Orden
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderInfo = {
        CodigoEmpresa: orderResult.recordset[0].CodigoEmpresa,
        EjercicioPedido: orderResult.recordset[0].EjercicioPedido,
        SeriePedido: orderResult.recordset[0].SeriePedido,
        CodigoCliente: orderResult.recordset[0].CodigoCliente,
        RazonSocial: orderResult.recordset[0].RazonSocial,
        Estado: orderResult.recordset[0].Estado,
        StatusAprobado: orderResult.recordset[0].StatusAprobado,
        NumeroPedido: orderResult.recordset[0].NumeroPedido,
        EsParcial: orderResult.recordset[0].EsParcial
      };

      // Crear mapa del estado actual
      const estadoActualMap = new Map();
      orderResult.recordset.forEach(item => {
        const key = `${item.Orden}-${item.CodigoArticulo}`;
        estadoActualMap.set(key, {
          Orden: item.Orden,
          CodigoArticulo: item.CodigoArticulo,
          DescripcionArticulo: item.DescripcionArticulo,
          UnidadesPedidas: item.UnidadesPedidas,
          UnidadesRecibidasActuales: item.UnidadesRecibidasActuales || 0,
          UnidadesPendientes: item.UnidadesPendientes,
          Precio: item.Precio,
          CodigoProveedor: item.CodigoProveedor,
          PorcentajeIva: item.PorcentajeIva,
          GrupoIva: item.GrupoIva
        });
      });

      // Validar y enriquecer items del frontend
      const itemsEnriquecidos = [];
      const errores = [];

      items.forEach(item => {
        const key = `${item.Orden}-${item.CodigoArticulo}`;
        const estadoActual = estadoActualMap.get(key);

        if (!estadoActual) {
          errores.push(`Artículo ${item.CodigoArticulo} no encontrado en el pedido`);
          return;
        }

        // El usuario introduce el TOTAL que debe quedar registrado
        const nuevoTotalRecibido = parseInt(item.UnidadesRecibidas) || 0;
        const unidadesRecibidasPreviamente = estadoActual.UnidadesRecibidasActuales || 0;

        // Validaciones
        if (nuevoTotalRecibido > estadoActual.UnidadesPedidas) {
          errores.push(`La cantidad recibida (${nuevoTotalRecibido}) excede lo pedido (${estadoActual.UnidadesPedidas}) para ${item.CodigoArticulo}`);
          return;
        }

        // Si hay diferencia con lo pedido, requerir comentario
        if (nuevoTotalRecibido !== estadoActual.UnidadesPedidas && !item.ComentarioRecepcion?.trim()) {
          errores.push(`Debe agregar un comentario para ${item.CodigoArticulo} (recibido: ${nuevoTotalRecibido}, pedido: ${estadoActual.UnidadesPedidas})`);
          return;
        }

        // Calcular delta (lo que se recibe en esta recepción)
        const deltaRecepcion = nuevoTotalRecibido - unidadesRecibidasPreviamente;

        itemsEnriquecidos.push({
          ...item,
          DescripcionArticulo: estadoActual.DescripcionArticulo,
          UnidadesPedidas: estadoActual.UnidadesPedidas,
          UnidadesRecibidasPreviamente: unidadesRecibidasPreviamente,
          UnidadesRecibidasNuevas: nuevoTotalRecibido, // TOTAL acumulado
          DeltaRecepcion: deltaRecepcion, // Incremento en esta recepción
          Precio: estadoActual.Precio,
          CodigoProveedor: estadoActual.CodigoProveedor,
          PorcentajeIva: estadoActual.PorcentajeIva,
          GrupoIva: estadoActual.GrupoIva
        });
      });

      if (errores.length > 0) {
        throw new Error(errores.join('; '));
      }

      const fechaActual = new Date();

      // ACTUALIZAR las líneas del pedido con el NUEVO TOTAL
      for (const item of itemsEnriquecidos) {
        const nuevoTotalRecibido = item.UnidadesRecibidasNuevas;
        const unidadesPedidas = item.UnidadesPedidas;
        const unidadesPendientes = unidadesPedidas - nuevoTotalRecibido;
        
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .input('Orden', item.Orden)
          .input('UnidadesRecibidas', nuevoTotalRecibido)
          .input('UnidadesPendientes', unidadesPendientes)
          .input('UnidadesServidas', nuevoTotalRecibido)
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

      // Calcular totales del pedido
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

      // Determinar nuevo estado y parcialidad
      let nuevoEstado;
      let esParcial = 0;

      if (totalRecibido === 0) {
        nuevoEstado = 0;
        esParcial = 0;
      } else if (totalPendiente === 0) {
        nuevoEstado = 2;
        esParcial = 0;
      } else {
        nuevoEstado = 0;
        esParcial = -1;
      }

      // Actualizar cabecera del pedido
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .input('Estado', nuevoEstado)
        .input('EsParcial', esParcial)
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET Estado = @Estado,
              EsParcial = @EsParcial
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      // Preparar items para albaranes - SOLO los que tienen delta positivo
      const itemsParaAlbaranes = itemsEnriquecidos
        .filter(item => item.DeltaRecepcion > 0)
        .map(item => ({
          Orden: item.Orden,
          CodigoArticulo: item.CodigoArticulo,
          DescripcionArticulo: item.DescripcionArticulo,
          UnidadesRecibidas: item.UnidadesRecibidasNuevas, // Enviamos el TOTAL acumulado
          UnidadesPedidas: item.UnidadesPedidas,
          Precio: item.Precio,
          CodigoProveedor: item.CodigoProveedor,
          PorcentajeIva: item.PorcentajeIva,
          GrupoIva: item.GrupoIva,
          ComentarioRecepcion: item.ComentarioRecepcion || ''
        }));

      // Generar albaranes de compra
      let albaranesCompraGenerados = [];
      if (itemsParaAlbaranes.length > 0) {
        try {
          albaranesCompraGenerados = await generarAlbaranProveedorAutomatico(
            transaction, 
            orderInfo, 
            itemsParaAlbaranes, 
            orderInfo.CodigoEmpresa,
            totalPendiente > 0 // esRecepcionParcial
          );
        } catch (error) {
          console.error('Error al generar albaranes:', error);
          // No lanzamos error para no revertir la recepción del pedido
        }
      }

      // Confirmar transacción
      await transaction.commit();

      // Preparar respuesta
      const nuevos = albaranesCompraGenerados.filter(a => a.esNuevo).length;
      const actualizados = albaranesCompraGenerados.filter(a => !a.esNuevo).length;
      
      const response = {
        success: true,
        message: `Recepción confirmada correctamente. ${nuevos} albarán(es) nuevo(s) creado(s), ${actualizados} actualizado(s).`,
        estado: nuevoEstado,
        esParcial: esParcial,
        estadoTexto: nuevoEstado === 2 ? 'Servido' : esParcial === -1 ? 'Pendiente (Parcial)' : 'Pendiente',
        totales: {
          pedido: totalPedido,
          recibido: totalRecibido,
          pendiente: totalPendiente
        },
        albaranesCompraGenerados: albaranesCompraGenerados.length,
        detallesAlbaranes: albaranesCompraGenerados,
        esRecepcionParcial: totalPendiente > 0,
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
      console.log(`🚀 Iniciando finalización del pedido ${orderId}`);

      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            Estado, 
            StatusAprobado,
            CodigoEmpresa,
            EjercicioPedido,
            SeriePedido,
            EsParcial,
            RazonSocial,
            CodigoCliente
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

      // 1. OBTENER ESTADO ACTUAL ANTES DE CUALQUIER CAMBIO
      const estadoActualResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            Orden,
            CodigoArticulo,
            UnidadesPedidas,
            UnidadesRecibidas,
            UnidadesPendientes,
            ComentarioRecepcion
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
          ORDER BY Orden
        `);

      const totalesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            SUM(UnidadesPendientes) as TotalPendiente,
            SUM(UnidadesRecibidas) as TotalRecibido
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      const totalPendiente = totalesResult.recordset[0].TotalPendiente || 0;
      const totalRecibido = totalesResult.recordset[0].TotalRecibido || 0;

      console.log('📋 ESTADO ANTES DE FINALIZAR:', {
        pedido: orderId,
        cliente: pedido.RazonSocial,
        codigoCliente: pedido.CodigoCliente,
        estadoActual: pedido.Estado,
        esParcialActual: pedido.EsParcial,
        totalRecibido: totalRecibido,
        totalPendiente: totalPendiente,
        lineas: estadoActualResult.recordset.map(l => ({
          articulo: l.CodigoArticulo,
          pedidas: l.UnidadesPedidas,
          recibidas: l.UnidadesRecibidas,
          pendientes: l.UnidadesPendientes,
          comentario: l.ComentarioRecepcion
        }))
      });

      // 2. VERIFICAR SI HAY ALBARANES EXISTENTES PARA ESTE PEDIDO
      const albaranesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            COUNT(*) as TotalAlbaranes,
            SUM(CASE WHEN StatusFacturado = -1 THEN 1 ELSE 0 END) as AlbaranesFacturados,
            SUM(CASE WHEN StatusFacturado = 0 THEN 1 ELSE 0 END) as AlbaranesNoFacturados
          FROM CabeceraAlbaranProveedor
          WHERE NumeroPedido = @NumeroPedido
        `);

      console.log('📦 ALBARANES EXISTENTES:', albaranesResult.recordset[0]);

      // 3. SOLO ACTUALIZAR EL ESTADO DEL PEDIDO (CABECERA)
      // NO modificar las líneas del pedido
      // NO modificar UnidadesRecibidas
      // NO generar albaranes
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .input('Estado', 2)  // Estado = 2 (Servido)
        .input('EsParcial', 0) // No parcial
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET Estado = @Estado,
              EsParcial = @EsParcial
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      // 4. ACTUALIZAR SOLO EL COMENTARIO EN LAS LÍNEAS (para tracking)
      // Pero NO cambiar UnidadesRecibidas ni UnidadesPendientes
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          UPDATE LineasPedidoCliente 
          SET 
            ComentarioRecepcion = ISNULL(ComentarioRecepcion, '') + 
              CASE 
                WHEN LEN(ISNULL(ComentarioRecepcion, '')) > 0 
                THEN '; [CERRADO MANUALMENTE - Sin más recepciones]'
                ELSE '[CERRADO MANUALMENTE - Sin más recepciones]'
              END
          WHERE NumeroPedido = @NumeroPedido 
          AND SeriePedido = @SeriePedido
        `);

      await transaction.commit();
      console.log(`✅ Transacción commitada para pedido ${orderId}`);

      // 5. VERIFICAR DESPUÉS DEL CAMBIO
      const estadoDespuesResult = await pool.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            Estado,
            EsParcial,
            (SELECT SUM(UnidadesRecibidas) FROM LineasPedidoCliente 
             WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido) as TotalRecibidoFinal,
            (SELECT SUM(UnidadesPendientes) FROM LineasPedidoCliente 
             WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido) as TotalPendienteFinal
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      const estadoFinal = estadoDespuesResult.recordset[0];

      console.log('✅ ESTADO DESPUÉS DE FINALIZAR:', {
        pedido: orderId,
        estado: estadoFinal.Estado,
        esParcial: estadoFinal.EsParcial,
        totalRecibidoFinal: estadoFinal.TotalRecibidoFinal,
        totalPendienteFinal: estadoFinal.TotalPendienteFinal,
        nota: 'LAS UNIDADES PENDIENTES SE MANTIENEN IGUAL - NO SE GENERARON ALBARANES'
      });

      res.status(200).json({
        success: true,
        message: '✅ Pedido marcado como servido correctamente.',
        detalles: [
          'Las unidades pendientes se mantienen sin cambios.',
          'No se generaron nuevos albaranes.',
          'Los albaranes existentes no se modificaron.',
          'El pedido ahora aparece como "Servido" en el sistema.'
        ].join(' '),
        estado: 2,
        esParcial: 0,
        unidadesRecibidas: totalRecibido,
        unidadesPendientes: totalPendiente,
        albaranesExistentes: {
          total: albaranesResult.recordset[0].TotalAlbaranes,
          facturados: albaranesResult.recordset[0].AlbaranesFacturados,
          noFacturados: albaranesResult.recordset[0].AlbaranesNoFacturados
        },
        advertencia: `Las ${totalPendiente} unidades pendientes no se marcaron como recibidas para no alterar los albaranes existentes.`,
        nota: 'Este cierre manual solo afecta el estado del pedido, no modifica las cantidades recibidas ni genera nuevos albaranes.'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Error en finalizeOrder (transacción):', err);
      res.status(500).json({ 
        success: false, 
        message: `Error al finalizar el pedido: ${err.message}`,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  } catch (error) {
    console.error('❌ Error en finalizeOrder (global):', error);
    res.status(500).json({ 
      success: false, 
      message: `Error al procesar la finalización: ${error.message}`
    });
  }
};

module.exports = {
  getOrderReception,
  confirmReception,
  finalizeOrder
};