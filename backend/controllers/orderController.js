const { getPool } = require('../db/Sage200db');

const createOrder = async (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'El pedido no contiene items válidos' 
    });
  }

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      const primerItem = items[0];
      
      if (!primerItem.CodigoCliente || !primerItem.CifDni) {
        throw new Error('Datos de cliente incompletos en los items');
      }

      const clienteResult = await transaction.request()
        .input('CodigoCliente', primerItem.CodigoCliente)
        .query(`
          SELECT CodigoEmpresa, RazonSocial, CodigoContable, IdDelegacion
          FROM CLIENTES 
          WHERE CodigoCliente = @CodigoCliente
        `);

      if (clienteResult.recordset.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const cliente = clienteResult.recordset[0];
      const codigoEmpresa = cliente.CodigoEmpresa || '9999';

      const clienteContaResult = await transaction.request()
        .input('CodigoCuenta', cliente.CodigoContable)
        .input('CodigoEmpresa', codigoEmpresa)
        .query(`
          SELECT NumeroPlazos, DiasPrimerPlazo, DiasEntrePlazos
          FROM CLIENTESCONTA
          WHERE CodigoCuenta = @CodigoCuenta AND CodigoEmpresa = @CodigoEmpresa
        `);

      const condicionesPago = clienteContaResult.recordset.length > 0 
        ? clienteContaResult.recordset[0]
        : { NumeroPlazos: 3, DiasPrimerPlazo: 30, DiasEntrePlazos: 30 };

      const contadorResult = await transaction.request()
        .input('sysGrupo', codigoEmpresa)
        .query(`
          SELECT sysContadorValor 
          FROM LSYSCONTADORES
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = 'PEDIDOS_CLI'
          AND (sysNumeroSerie = 'Web' OR sysNumeroSerie IS NULL)
        `);

      let numeroPedido = 1;
      if (contadorResult.recordset.length > 0) {
        numeroPedido = contadorResult.recordset[0].sysContadorValor + 1;
      }

      const almacenesResult = await transaction.request()
        .input('sysGrupo', codigoEmpresa)
        .input('sysContenidoIni', 'cen')
        .query(`
          SELECT sysItem, sysContenidoIni 
          FROM lsysini 
          WHERE sysGrupo = @sysGrupo
          AND sysContenidoIni = @sysContenidoIni
          AND sysSeccion IN ('GES', 'GPR')
          AND sysItem IN ('AlmacenDefecto', 'AlmacenFabrica')
        `);

      const almacenes = {};
      almacenesResult.recordset.forEach(row => {
        almacenes[row.sysItem] = row.sysContenidoIni;
      });

      const codigoAlmacen = almacenes['AlmacenDefecto'] || 'CEN';
      const codigoAlmacenAnterior = almacenes['AlmacenFabrica'] || 'CEN';

      const fechaActual = new Date();
      const fechaPedido = `${fechaActual.toISOString().split('T')[0]} 00:00:00.000`;
      const fechaRegistro = fechaActual.toISOString().replace('T', ' ').replace(/\..+/, '');

      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', 'Web')
        .input('NumeroPedido', numeroPedido)
        .input('FechaPedido', fechaPedido)
        .input('FechaNecesaria', fechaPedido)
        .input('FechaEntrega', fechaPedido)
        .input('FechaTope', fechaPedido)
        .input('CodigoCliente', primerItem.CodigoCliente)
        .input('CifDni', primerItem.CifDni)
        .input('RazonSocial', cliente.RazonSocial || '')
        .input('IdDelegacion', cliente.IdDelegacion || '')
        .input('StatusAprobado', 0)
        .input('MantenerCambio_', -1)
        .input('SiglaNacion', 'ES')
        .input('NumeroPlazos', condicionesPago.NumeroPlazos)
        .input('DiasPrimerPlazo', condicionesPago.DiasPrimerPlazo)
        .input('DiasEntrePlazos', condicionesPago.DiasEntrePlazos)
        .query(`
          INSERT INTO CabeceraPedidoCliente (
            CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
            FechaPedido, FechaNecesaria, FechaEntrega, FechaTope,
            CodigoCliente, CifDni, RazonSocial, IdDelegacion,
            StatusAprobado, MantenerCambio_,
            SiglaNacion,
            NumeroPlazos, DiasPrimerPlazo, DiasEntrePlazos
          )
          VALUES (
            @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
            @FechaPedido, @FechaNecesaria, @FechaEntrega, @FechaTope,
            @CodigoCliente, @CifDni, @RazonSocial, @IdDelegacion,
            @StatusAprobado, @MantenerCambio_,
            @SiglaNacion,
            @NumeroPlazos, @DiasPrimerPlazo, @DiasEntrePlazos
          )
        `);

      for (const [index, item] of items.entries()) {
        const unidadesPedidas = item.Cantidad || 1;

        const ivaResult = await transaction.request()
          .input('CodigoIva', 21)
          .input('CodigoTerritorio', 0)
          .query(`
            SELECT CodigoIva, [%Iva], CodigoTerritorio
            FROM tiposiva 
            WHERE CodigoIva = @CodigoIva AND CodigoTerritorio = @CodigoTerritorio
          `);

        if (ivaResult.recordset.length === 0) {
          throw new Error('Tipo de IVA no encontrado');
        }

        const tipoIva = ivaResult.recordset[0];

        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioPedido', fechaActual.getFullYear())
          .input('SeriePedido', 'Web')
          .input('NumeroPedido', numeroPedido)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', item.DescripcionArticulo)
          .input('UnidadesPedidas', unidadesPedidas)
          .input('UnidadesPendientes', unidadesPedidas)
          .input('Unidades2_', unidadesPedidas)
          .input('UnidadesPendientesFabricar', unidadesPedidas)
          .input('Precio', item.PrecioCompra)
          .input('CodigoIva', tipoIva.CodigoIva)
          .input('PorcentajeIva', tipoIva['%Iva'])
          .input('GrupoIva', tipoIva.CodigoTerritorio)
          .input('CodigoAlmacen', codigoAlmacen)
          .input('CodigoAlmacenAnterior', codigoAlmacenAnterior)
          .input('FechaRegistro', fechaRegistro)
          .input('CodigoDelCliente', '')
          .input('CodigoProveedor', '')
          .query(`
            INSERT INTO LineasPedidoCliente (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
              CodigoArticulo, DescripcionArticulo, UnidadesPedidas, UnidadesPendientes,
              Unidades2_, UnidadesPendientesFabricar, Precio, 
              CodigoIva, [%Iva], GrupoIva,
              CodigoAlmacen, CodigoAlmacenAnterior, FechaRegistro, 
              CodigoDelCliente, CodigoProveedor
            )
            VALUES (
              @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @Orden,
              @CodigoArticulo, @DescripcionArticulo, @UnidadesPedidas, @UnidadesPendientes,
              @Unidades2_, @UnidadesPendientesFabricar, @Precio, 
              @CodigoIva, @PorcentajeIva, @GrupoIva,
              @CodigoAlmacen, @CodigoAlmacenAnterior, @FechaRegistro, 
              @CodigoDelCliente, @CodigoProveedor
            )
          `);
      }

      await transaction.request()
        .input('sysGrupo', codigoEmpresa)
        .input('sysContadorValor', numeroPedido)
        .query(`
          UPDATE LSYSCONTADORES 
          SET sysContadorValor = @sysContadorValor
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = 'PEDIDOS_CLI'
          AND (sysNumeroSerie = 'Web' OR sysNumeroSerie IS NULL)
        `);

      await transaction.commit();

      return res.status(201).json({
        success: true,
        orderId: numeroPedido,
        seriePedido: 'Web',
        message: 'Pedido creado correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error al crear pedido:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al procesar el pedido' 
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const pool = await getPool();
    const { codigoCliente } = req.query;

    if (!codigoCliente) {
      return res.status(400).json({ success: false, message: 'Código de cliente no proporcionado' });
    }

    const ordersResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          COUNT(l.Orden) AS NumeroLineas,
          c.StatusAprobado,
          c.SeriePedido
        FROM CabeceraPedidoCliente c
        LEFT JOIN LineasPedidoCliente l ON 
          c.CodigoEmpresa = l.CodigoEmpresa AND
          c.EjercicioPedido = l.EjercicioPedido AND
          c.SeriePedido = l.SeriePedido AND
          c.NumeroPedido = l.NumeroPedido
        WHERE c.CodigoCliente = @CodigoCliente
        GROUP BY 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          c.StatusAprobado,
          c.SeriePedido
        ORDER BY c.FechaPedido DESC
      `);

    const ordersWithDetails = await Promise.all(
      ordersResult.recordset.map(async (order) => {
        const detailsResult = await pool.request()
          .input('NumeroPedido', order.NumeroPedido)
          .input('SeriePedido', order.SeriePedido)
          .query(`
            SELECT 
              CodigoArticulo, 
              DescripcionArticulo, 
              UnidadesPedidas,
              Precio
            FROM LineasPedidoCliente
            WHERE NumeroPedido = @NumeroPedido
            AND SeriePedido = @SeriePedido
            ORDER BY Orden
          `);

        return {
          ...order,
          Estado: order.StatusAprobado === 0 ? 'Pendiente' : 'Aprobado',
          Productos: detailsResult.recordset
        };
      })
    );

    return res.status(200).json({ success: true, orders: ordersWithDetails });

  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error al obtener los pedidos' });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const pool = await getPool();
    const { numeroPedido } = req.params;
    const { codigoCliente, seriePedido } = req.query;

    if (!codigoCliente || !seriePedido) {
      return res.status(400).json({ success: false, message: 'Parámetros incompletos' });
    }

    const orderResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('CodigoCliente', codigoCliente)
      .input('SeriePedido', seriePedido)
      .query(`
        SELECT 
          NumeroPedido, 
          FechaPedido, 
          RazonSocial,
          StatusAprobado,
          SeriePedido
        FROM CabeceraPedidoCliente
        WHERE NumeroPedido = @NumeroPedido
        AND CodigoCliente = @CodigoCliente
        AND SeriePedido = @SeriePedido
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const linesResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('SeriePedido', seriePedido)
      .query(`
        SELECT 
          CodigoArticulo, 
          DescripcionArticulo, 
          UnidadesPedidas,
          Precio
        FROM LineasPedidoCliente
        WHERE NumeroPedido = @NumeroPedido
        AND SeriePedido = @SeriePedido
        ORDER BY Orden
      `);

    return res.status(200).json({
      success: true,
      order: {
        ...orderResult.recordset[0],
        Estado: orderResult.recordset[0].StatusAprobado === 0 ? 'Pendiente' : 'Aprobado',
        Productos: linesResult.recordset
      }
    });

  } catch (error) {
    console.error('Error al obtener detalle del pedido:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error al obtener el detalle del pedido' });
  }
};

module.exports = { 
  createOrder, 
  getOrders, 
  getOrderDetails 
};