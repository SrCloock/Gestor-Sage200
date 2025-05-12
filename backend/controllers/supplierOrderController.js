const { getPool } = require('../db/Sage200db');

const createSupplierOrder = async (req, res) => {
  const { items, deliveryDate } = req.body;
  
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

      // Obtener información del cliente
      const clienteResult = await transaction.request()
        .input('CodigoCliente', primerItem.CodigoCliente)
        .query(`
          SELECT 
            c.CodigoEmpresa, c.RazonSocial, c.CodigoContable, c.IdDelegacion,
            c.Domicilio, c.CodigoPostal, c.Municipio, c.Provincia, c.Nacion,
            c.CodigoNacion, c.CodigoProvincia, c.CodigoMunicipio,
            c.SiglaNacion, c.CifDni
          FROM CLIENTES c
          WHERE c.CodigoCliente = @CodigoCliente
        `);

      if (clienteResult.recordset.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const cliente = clienteResult.recordset[0];
      const codigoEmpresa = cliente.CodigoEmpresa || '9999';

      // Obtener datos extendidos desde ClientesProveedores (si existen)
      const cpResult = await transaction.request()
        .input('CifDni', cliente.CifDni)
        .input('SiglaNacion', cliente.SiglaNacion)
        .query(`
          SELECT 
            ViaPublica, Numero1, Numero2, Escalera, Piso, Puerta, Letra,
            CodigoPostal, Municipio, Provincia, Nacion,
            CodigoNacion, CodigoProvincia, CodigoMunicipio
          FROM ClientesProveedores
          WHERE CifDni = @CifDni AND SiglaNacion = @SiglaNacion
        `);

      const cp = cpResult.recordset[0] || {};

      // Usar datos de ClientesProveedores si están presentes y no vacíos
      const getDatoPreferente = (cpDato, cDato) =>
        cpDato !== null && cpDato !== undefined && cpDato !== '' ? cpDato : cDato;

      const domicilio = [
        cp.ViaPublica, cp.Numero1, cp.Numero2, cp.Escalera, cp.Piso, cp.Puerta, cp.Letra
      ].filter(Boolean).join(' ') || cliente.Domicilio || '';

      const codigoPostal = getDatoPreferente(cp.CodigoPostal, cliente.CodigoPostal || '');
      const municipio = getDatoPreferente(cp.Municipio, cliente.Municipio || '');
      const provincia = getDatoPreferente(cp.Provincia, cliente.Provincia || '');
      const nacion = getDatoPreferente(cp.Nacion, cliente.Nacion || '');
      const codigoNacion = getDatoPreferente(cp.CodigoNacion, cliente.CodigoNacion || 'ES');
      const codigoProvincia = getDatoPreferente(cp.CodigoProvincia, cliente.CodigoProvincia || '');
      const codigoMunicipio = getDatoPreferente(cp.CodigoMunicipio, cliente.CodigoMunicipio || '');

      // Obtener condiciones de pago
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

      // Obtener próximo número de pedido
      const contadorResult = await transaction.request()
        .input('sysGrupo', codigoEmpresa)
        .query(`
          SELECT sysContadorValor 
          FROM LSYSCONTADORES
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = 'PEDIDOS_PROV'
          AND (sysNumeroSerie = 'Web' OR sysNumeroSerie IS NULL)
        `);

      let numeroPedido = 1;
      if (contadorResult.recordset.length > 0) {
        numeroPedido = contadorResult.recordset[0].sysContadorValor + 1;
      }

      // Obtener almacenes por defecto
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

      // Fechas
      const fechaActual = new Date();
      const fechaPedido = `${fechaActual.toISOString().split('T')[0]} 00:00:00.000`;
      const fechaEntrega = deliveryDate 
        ? `${deliveryDate} 00:00:00.000`
        : fechaPedido;

      const usuarioActual = req.user?.username || 'WEB';

      // Insertar cabecera con las columnas correctas
      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', 'Web')
        .input('NumeroPedido', numeroPedido)
        .input('FechaPedido', fechaPedido)
        .input('FechaNecesaria', fechaEntrega)
        .input('CifDni', primerItem.CifDni)
        .input('RazonSocial', cliente.RazonSocial || '')
        .input('IdDelegacion', cliente.IdDelegacion || '')
        .input('Domicilio', domicilio)
        .input('CodigoPostal', codigoPostal)
        .input('CodigoMunicipio', codigoMunicipio)
        .input('Municipio', municipio)
        .input('CodigoProvincia', codigoProvincia)
        .input('Provincia', provincia)
        .input('CodigoNacion', codigoNacion)
        .input('Nacion', nacion)
        .input('SiglaNacion', 'ES')
        .input('NumeroPlazos', condicionesPago.NumeroPlazos)
        .input('DiasPrimerPlazo', condicionesPago.DiasPrimerPlazo)
        .input('DiasEntrePlazos', condicionesPago.DiasEntrePlazos)
        .input('StatusAprobado', 0)
        .input('BaseImponible', 0)
        .input('TotalIva', 0)
        .input('ImporteLiquido', 0)
        .input('NumeroLineas', 0)
        .query(`
          INSERT INTO CabeceraPedidoProveedor (
            CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
            FechaPedido, FechaNecesaria,
            CifDni, RazonSocial, IdDelegacion,
            Domicilio, CodigoPostal, CodigoMunicipio, Municipio, 
            CodigoProvincia, Provincia, CodigoNacion, Nacion, SiglaNacion,
            NumeroPlazos, DiasPrimerPlazo, DiasEntrePlazos,
            StatusAprobado,
            BaseImponible, TotalIva, ImporteLiquido,
            NumeroLineas
          )
          VALUES (
            @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
            @FechaPedido, @FechaNecesaria,
            @CifDni, @RazonSocial, @IdDelegacion,
            @Domicilio, @CodigoPostal, @CodigoMunicipio, @Municipio,
            @CodigoProvincia, @Provincia, @CodigoNacion, @Nacion, @SiglaNacion,
            @NumeroPlazos, @DiasPrimerPlazo, @DiasEntrePlazos,
            @StatusAprobado,
            @BaseImponible, @TotalIva, @ImporteLiquido,
            @NumeroLineas
          )
        `);

      // Insertar cada línea del pedido con las columnas correctas
      for (const [index, item] of items.entries()) {
        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoEmpresa', codigoEmpresa)
          .query(`
            SELECT DescripcionArticulo, DescripcionLinea 
            FROM Articulos
            WHERE CodigoArticulo = @CodigoArticulo
            AND CodigoEmpresa = @CodigoEmpresa
          `);

        if (articuloResult.recordset.length === 0) {
          throw new Error(`Artículo ${item.CodigoArticulo} no encontrado`);
        }

        const articulo = articuloResult.recordset[0];
        const descripcionLinea = articulo.DescripcionLinea || '';

        const ivaResult = await transaction.request()
          .input('CodigoIva', item.CodigoIva || 21)
          .input('CodigoTerritorio', 0)
          .query(`
            SELECT CodigoIva, [%Iva], CodigoTerritorio
            FROM tiposiva 
            WHERE CodigoIva = @CodigoIva AND CodigoTerritorio = @CodigoTerritorio
          `);

        if (ivaResult.recordset.length === 0) {
          throw new Error(`Tipo de IVA ${item.CodigoIva || 21} no encontrado`);
        }

        const tipoIva = ivaResult.recordset[0];

        const unidadesPedidas = parseFloat(item.Cantidad) || 1;
        const precio = parseFloat(item.PrecioCompra) || 0;
        const porcentajeIva = parseFloat(tipoIva['%Iva']) || 21;

        const baseImponible = precio * unidadesPedidas;
        const cuotaIva = baseImponible * (porcentajeIva / 100);
        const importeLiquido = baseImponible + cuotaIva;

        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioPedido', fechaActual.getFullYear())
          .input('SeriePedido', 'Web')
          .input('NumeroPedido', numeroPedido)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', articulo.DescripcionArticulo)
          .input('DescripcionLinea', descripcionLinea)
          .input('UnidadesPedidas', unidadesPedidas)
          .input('Precio', precio)
          .input('ImporteBruto', baseImponible)
          .input('ImporteNeto', baseImponible)
          .input('BaseImponible', baseImponible)
          .input('CuotaIva', cuotaIva)
          .input('TotalIva', cuotaIva)
          .input('ImporteLiquido', importeLiquido)
          .input('CodigoIva', tipoIva.CodigoIva)
          .input('PorcentajeIva', porcentajeIva)
          .input('CodigoAlmacen', codigoAlmacen)
          .input('CodigoAlmacenAnterior', codigoAlmacenAnterior)
          .input('FechaRegistro', `${fechaActual.toISOString().split('T')[0]} 00:00:00.000`)
          .query(`
            INSERT INTO LineasPedidoProveedor (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
              CodigoArticulo, DescripcionArticulo, DescripcionLinea,
              UnidadesPedidas,
              Precio,
              ImporteBruto, ImporteNeto,
              BaseImponible,
              CuotaIva, TotalIva, ImporteLiquido,
              CodigoIva, [%Iva],
              CodigoAlmacen, CodigoAlmacenAnterior, FechaRegistro
            )
            VALUES (
              @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @Orden,
              @CodigoArticulo, @DescripcionArticulo, @DescripcionLinea,
              @UnidadesPedidas,
              @Precio,
              @ImporteBruto, @ImporteNeto,
              @BaseImponible,
              @CuotaIva, @TotalIva, @ImporteLiquido,
              @CodigoIva, @PorcentajeIva,
              @CodigoAlmacen, @CodigoAlmacenAnterior, @FechaRegistro
            )
          `);
      }

      // Calcular totales del pedido
      const totalesResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', 'Web')
        .input('NumeroPedido', numeroPedido)
        .query(`
          SELECT 
            SUM(UnidadesPedidas * Precio) AS BaseImponible,
            SUM((UnidadesPedidas * Precio) * ([%Iva] / 100.0)) AS TotalIVA,
            COUNT(*) AS NumeroLineas
          FROM LineasPedidoProveedor
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;
      const numeroLineas = parseInt(totalesResult.recordset[0].NumeroLineas) || 0;

      // Actualizar cabecera con los totales calculados
      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', 'Web')
        .input('NumeroPedido', numeroPedido)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('NumeroLineas', numeroLineas)
        .query(`
          UPDATE CabeceraPedidoProveedor
          SET 
            BaseImponible = @BaseImponible,
            TotalIva = @TotalIVA,
            ImporteLiquido = @ImporteLiquido,
            NumeroLineas = @NumeroLineas
          WHERE 
            CodigoEmpresa = @CodigoEmpresa AND
            EjercicioPedido = @EjercicioPedido AND
            SeriePedido = @SeriePedido AND
            NumeroPedido = @NumeroPedido
        `);

      // Actualizar contador de pedidos
      await transaction.request()
        .input('sysGrupo', codigoEmpresa)
        .input('sysContadorValor', numeroPedido)
        .query(`
          UPDATE LSYSCONTADORES 
          SET sysContadorValor = @sysContadorValor
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = 'PEDIDOS_PROV'
          AND (sysNumeroSerie = 'Web' OR sysNumeroSerie IS NULL)
        `);

      await transaction.commit();

      return res.status(201).json({
        success: true,
        orderId: numeroPedido,
        seriePedido: 'Web',
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        importeLiquido: importeLiquidoTotal,
        numeroLineas: numeroLineas,
        deliveryDate: deliveryDate || null,
        message: 'Pedido a proveedor creado correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error al crear pedido a proveedor:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al procesar el pedido a proveedor' 
    });
  }
};

const getSupplierOrders = async (req, res) => {
  try {
    const pool = await getPool();
    const { codigoCliente } = req.query;

    if (!codigoCliente) {
      return res.status(400).json({ success: false, message: 'Código de cliente no proporcionado' });
    }

    // Consulta principal de pedidos
    const ordersResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          c.NumeroLineas,
          c.StatusAprobado,
          c.SeriePedido,
          c.BaseImponible,
          c.TotalIva,
          c.ImporteLiquido,
          c.FechaNecesaria,
          c.Usuario,
          c.Domicilio,
          c.CodigoPostal,
          c.Municipio,
          c.Provincia,
          c.Nacion,
          c.CodigoContable
        FROM CabeceraPedidoProveedor c
        WHERE c.CodigoCliente = @CodigoCliente
        ORDER BY c.FechaPedido DESC
        OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
      `);

    // Obtener detalles de cada pedido
    const ordersWithDetails = await Promise.all(
      ordersResult.recordset.map(async (order) => {
        const detailsResult = await pool.request()
          .input('NumeroPedido', order.NumeroPedido)
          .input('SeriePedido', order.SeriePedido)
          .query(`
            SELECT 
              CodigoArticulo, 
              DescripcionArticulo,
              DescripcionLinea,
              UnidadesPedidas,
              Precio,
              ImporteBruto,
              ImporteNeto,
              ImporteLiquido,
              TotalIva
            FROM LineasPedidoProveedor
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

    return res.status(200).json({ 
      success: true, 
      orders: ordersWithDetails,
      total: ordersWithDetails.length,
      message: 'Pedidos a proveedores obtenidos correctamente'
    });

  } catch (error) {
    console.error('Error al obtener pedidos a proveedores:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al obtener los pedidos a proveedores' 
    });
  }
};

const getSupplierOrdersDetails = async (req, res) => {
  try {
    const pool = await getPool();
    const { numeroPedido } = req.params;
    const { codigoCliente, seriePedido } = req.query;

    if (!codigoCliente || !seriePedido) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros incompletos (se requieren codigoCliente y seriePedido)' 
      });
    }

    // Consulta de la cabecera del pedido
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
          SeriePedido,
          BaseImponible,
          TotalIVA,
          ImporteLiquido,
          NumeroLineas,
          FechaNecesaria,
          Usuario,
          Domicilio,
          CodigoPostal,
          Municipio,
          Provincia,
          Nacion,
          CodigoContable
        FROM CabeceraPedidoProveedor
        WHERE NumeroPedido = @NumeroPedido
        AND CodigoCliente = @CodigoCliente
        AND SeriePedido = @SeriePedido
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido a proveedor no encontrado' 
      });
    }

    // Consulta de las líneas del pedido
    const linesResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('SeriePedido', seriePedido)
      .query(`
        SELECT 
          CodigoArticulo, 
          DescripcionArticulo,
          DescripcionLinea,
          UnidadesPedidas,
          Precio,
          ImporteBruto,
          ImporteNeto,
          ImporteLiquido,
          TotalIva
        FROM LineasPedidoProveedor
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
      },
      message: 'Detalle del pedido a proveedor obtenido correctamente'
    });

  } catch (error) {
    console.error('Error al obtener detalle del pedido a proveedor:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al obtener el detalle del pedido a proveedor' 
    });
  }
};

module.exports = { 
  createSupplierOrder, 
  getSupplierOrders, 
  getSupplierOrdersDetails 
};