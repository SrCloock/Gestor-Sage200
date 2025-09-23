const { getPool } = require('../db/Sage200db');

const SERIE_PEDIDO = 'WebCD';

// Función para obtener texto del estado
const getStatusText = (statusAprobado, estado) => {
  if (statusAprobado === 0) return 'Revisando';
  if (statusAprobado === -1) {
    switch (estado) {
      case 0: return 'Preparando';
      case 1: return 'Parcial';
      case 2: return 'Servido';
      default: return 'Preparando';
    }
  }
  return 'Desconocido';
};

// Función para verificar si es editable
const canEditOrder = (statusAprobado) => {
  return statusAprobado === 0; // Solo editable en "Revisando"
};

const createOrder = async (req, res) => {
  const { items, deliveryDate, comment } = req.body;
  
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
      // Verificar que todos los items pertenecen al mismo cliente
      const clientesUnicos = [...new Set(items.map(item => item.CodigoCliente))];
      if (clientesUnicos.length !== 1) {
        throw new Error('Todos los artículos del pedido deben pertenecer al mismo cliente');
      }
      
      const codigoCliente = clientesUnicos[0];
      const primerItem = items[0];

      if (!codigoCliente || !primerItem.CifDni) {
        throw new Error('Datos de cliente incompletos en los items');
      }

      // Obtener información del cliente
      const clienteResult = await transaction.request()
        .input('CodigoCliente', codigoCliente)
        .query(`
          SELECT 
            c.CodigoEmpresa, c.RazonSocial, c.CodigoContable, c.IdDelegacion,
            c.Domicilio, c.CodigoPostal, c.Municipio, c.Provincia, c.Nacion,
            c.CodigoNacion, c.CodigoProvincia, c.CodigoMunicipio,
            c.SiglaNacion, c.CifDni, c.CifEuropeo
          FROM CLIENTES c
          WHERE c.CodigoCliente = @CodigoCliente
        `);

      if (clienteResult.recordset.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const cliente = clienteResult.recordset[0];
      const codigoEmpresa = cliente.CodigoEmpresa || '9999';

      const fechaActual = new Date();

      // Obtener información de dirección del cliente
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

      // Función para obtener el valor preferente
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

      const condicionesPago = clienteContaResult.recordset[0] || {
        NumeroPlazos: 3,
        DiasPrimerPlazo: 30,
        DiasEntrePlazos: 30
      };

      // Obtener el próximo número de pedido
      const contadorResult = await transaction.request()
        .input('sysGrupo', codigoEmpresa)
        .input('sysNombreContador', 'PEDIDOS_CLI')
        .input('sysNumeroSerie', SERIE_PEDIDO)
        .query(`
          SELECT sysContadorValor 
          FROM LSYSCONTADORES
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = @sysNombreContador
          AND sysNumeroSerie = @sysNumeroSerie
        `);

      let numeroPedido = 1;
      
      if (contadorResult.recordset.length > 0) {
        numeroPedido = contadorResult.recordset[0].sysContadorValor + 1;
        
        await transaction.request()
          .input('sysGrupo', codigoEmpresa)
          .input('sysNombreContador', 'PEDIDOS_CLI')
          .input('sysNumeroSerie', SERIE_PEDIDO)
          .input('sysContadorValor', numeroPedido)
          .query(`
            UPDATE LSYSCONTADORES 
            SET sysContadorValor = @sysContadorValor
            WHERE sysGrupo = @sysGrupo
            AND sysNombreContador = @sysNombreContador
            AND sysNumeroSerie = @sysNumeroSerie
          `);
      } else {
        const maxResult = await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioPedido', fechaActual.getFullYear())
          .input('SeriePedido', SERIE_PEDIDO)
          .query(`
            SELECT MAX(NumeroPedido) as MaxNumero
            FROM CabeceraPedidoCliente
            WHERE CodigoEmpresa = @CodigoEmpresa
            AND EjercicioPedido = @EjercicioPedido
            AND SeriePedido = @SeriePedido
          `);

        numeroPedido = (maxResult.recordset[0].MaxNumero || 0) + 1;
        
        await transaction.request()
          .input('sysGrupo', codigoEmpresa)
          .input('sysNombreContador', 'PEDIDOS_CLI')
          .input('sysNumeroSerie', SERIE_PEDIDO)
          .input('sysContadorValor', numeroPedido)
          .query(`
            INSERT INTO LSYSCONTADORES (sysGrupo, sysNombreContador, sysNumeroSerie, sysContadorValor)
            VALUES (@sysGrupo, @sysNombreContador, @sysNumeroSerie, @sysContadorValor)
          `);
      }

      // Verificar si el pedido ya existe
      const pedidoExistente = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', numeroPedido)
        .query(`
          SELECT COUNT(*) as Existe
          FROM CabeceraPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      if (pedidoExistente.recordset[0].Existe > 0) {
        throw new Error(`El pedido ${SERIE_PEDIDO}-${numeroPedido} ya existe`);
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

      const fechaPedido = `${fechaActual.toISOString().split('T')[0]} 00:00:00.000`;
      const fechaEntrega = deliveryDate 
        ? `${deliveryDate} 00:00:00.000`
        : fechaPedido;

      // Insertar cabecera del pedido - ESTADOS CORREGIDOS
      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', numeroPedido)
        .input('FechaPedido', fechaPedido)
        .input('FechaNecesaria', fechaEntrega)
        .input('FechaEntrega', fechaEntrega)
        .input('FechaTope', fechaEntrega)
        .input('CodigoCliente', codigoCliente)
        .input('CifDni', primerItem.CifDni)
        .input('CifEuropeo', cliente.CifEuropeo || '')
        .input('RazonSocial', cliente.RazonSocial || '')
        .input('Nombre', cliente.RazonSocial || '')
        .input('IdDelegacion', cliente.IdDelegacion || '')
        .input('Domicilio', domicilio)
        .input('CodigoPostal', codigoPostal)
        .input('Municipio', municipio)
        .input('Provincia', provincia)
        .input('Nacion', nacion)
        .input('CodigoNacion', codigoNacion)
        .input('CodigoProvincia', codigoProvincia)
        .input('CodigoMunicipio', codigoMunicipio)
        .input('CodigoContable', cliente.CodigoContable || '')
        .input('StatusAprobado', 0)  // Revisando
        .input('Estado', 0)          // Revisando
        .input('MantenerCambio_', -1)
        .input('SiglaNacion', 'ES')
        .input('NumeroPlazos', condicionesPago.NumeroPlazos)
        .input('DiasPrimerPlazo', condicionesPago.DiasPrimerPlazo)
        .input('DiasEntrePlazos', condicionesPago.DiasEntrePlazos)
        .input('BaseImponible', 0)
        .input('TotalIva', 0)
        .input('ImporteLiquido', 0)
        .input('NumeroLineas', 0)
        .input('ObservacionesPedido', comment || '')
        .input('CodigoCondiciones', 3)
        .input('FormadePago', 'Tres plazos a 30, 60 y 90')
        .query(`
          INSERT INTO CabeceraPedidoCliente (
            CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
            FechaPedido, FechaNecesaria, FechaEntrega, FechaTope,
            CodigoCliente, CifDni, CifEuropeo, RazonSocial, Nombre, IdDelegacion,
            Domicilio, CodigoPostal, Municipio, Provincia, Nacion,
            CodigoNacion, CodigoProvincia, CodigoMunicipio, CodigoContable,
            StatusAprobado, Estado, MantenerCambio_,
            SiglaNacion,
            NumeroPlazos, DiasPrimerPlazo, DiasEntrePlazos,
            BaseImponible, TotalIva, ImporteLiquido,
            NumeroLineas,
            ObservacionesPedido,
            CodigoCondiciones, FormadePago
          )
          VALUES (
            @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
            @FechaPedido, @FechaNecesaria, @FechaEntrega, @FechaTope,
            @CodigoCliente, @CifDni, @CifEuropeo, @RazonSocial, @Nombre, @IdDelegacion,
            @Domicilio, @CodigoPostal, @Municipio, @Provincia, @Nacion,
            @CodigoNacion, @CodigoProvincia, @CodigoMunicipio, @CodigoContable,
            @StatusAprobado, @Estado, @MantenerCambio_,
            @SiglaNacion,
            @NumeroPlazos, @DiasPrimerPlazo, @DiasEntrePlazos,
            @BaseImponible, @TotalIva, @ImporteLiquido,
            @NumeroLineas,
            @ObservacionesPedido,
            @CodigoCondiciones, @FormadePago
          )
        `);

      // Insertar líneas del pedido
      for (const [index, item] of items.entries()) {
        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoProveedor', item.CodigoProveedor || '')
          .input('CodigoEmpresa', codigoEmpresa)
          .query(`
            SELECT DescripcionArticulo, DescripcionLinea 
            FROM Articulos
            WHERE CodigoArticulo = @CodigoArticulo
            AND (CodigoProveedor = @CodigoProveedor OR @CodigoProveedor = '')
            AND CodigoEmpresa = @CodigoEmpresa
          `);

        if (articuloResult.recordset.length === 0) {
          throw new Error(`Artículo ${item.CodigoArticulo} no encontrado`);
        }

        const articulo = articuloResult.recordset[0];
        const descripcionLinea = articulo.DescripcionLinea || '';

        // Obtener información de IVA
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
          .input('SeriePedido', SERIE_PEDIDO)
          .input('NumeroPedido', numeroPedido)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', articulo.DescripcionArticulo)
          .input('DescripcionLinea', descripcionLinea)
          .input('UnidadesPedidas', unidadesPedidas)
          .input('UnidadesPendientes', unidadesPedidas)
          .input('Unidades2_', unidadesPedidas)
          .input('UnidadesPendientesFabricar', unidadesPedidas)
          .input('Precio', precio)
          .input('ImporteBruto', baseImponible)
          .input('ImporteNeto', baseImponible)
          .input('ImporteParcial', baseImponible)
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)
          .input('CuotaIva', cuotaIva)
          .input('TotalIva', cuotaIva)
          .input('ImporteLiquido', importeLiquido)
          .input('CodigoIva', tipoIva.CodigoIva)
          .input('PorcentajeIva', porcentajeIva)
          .input('GrupoIva', tipoIva.CodigoTerritorio)
          .input('CodigoAlmacen', codigoAlmacen)
          .input('CodigoAlmacenAnterior', codigoAlmacenAnterior)
          .input('FechaRegistro', `${fechaActual.toISOString().split('T')[0]} 00:00:00.000`)
          .input('CodigoDelCliente', '')
          .input('CodigoProveedor', item.CodigoProveedor || '')
          .query(`
            INSERT INTO LineasPedidoCliente (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
              CodigoArticulo, DescripcionArticulo, DescripcionLinea,
              UnidadesPedidas, UnidadesPendientes, Unidades2_, UnidadesPendientesFabricar,
              Precio,
              ImporteBruto, ImporteNeto, ImporteParcial,
              BaseImponible, BaseIva,
              CuotaIva, TotalIva, ImporteLiquido,
              CodigoIva, [%Iva], GrupoIva,
              CodigoAlmacen, CodigoAlmacenAnterior, FechaRegistro,
              CodigoDelCliente, CodigoProveedor
            )
            VALUES (
              @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @Orden,
              @CodigoArticulo, @DescripcionArticulo, @DescripcionLinea,
              @UnidadesPedidas, @UnidadesPendientes, @Unidades2_, @UnidadesPendientesFabricar,
              @Precio,
              @ImporteBruto, @ImporteNeto, @ImporteParcial,
              @BaseImponible, @BaseIva,
              @CuotaIva, @TotalIva, @ImporteLiquido,
              @CodigoIva, @PorcentajeIva, @GrupoIva,
              @CodigoAlmacen, @CodigoAlmacenAnterior, @FechaRegistro,
              @CodigoDelCliente, @CodigoProveedor
            )
          `);
      }

      // Recalcular totales del pedido
      const totalesResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', numeroPedido)
        .query(`
          SELECT 
            SUM(UnidadesPedidas * Precio) AS BaseImponible,
            SUM((UnidadesPedidas * Precio) * ([%Iva] / 100.0)) AS TotalIVA,
            COUNT(*) AS NumeroLineas
          FROM LineasPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;
      const numeroLineas = parseInt(totalesResult.recordset[0].NumeroLineas) || 0;

      // Actualizar cabecera con totales
      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', numeroPedido)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('NumeroLineas', numeroLineas)
        .query(`
          UPDATE CabeceraPedidoCliente
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

      await transaction.commit();

      return res.status(201).json({
        success: true,
        orderId: numeroPedido,
        seriePedido: SERIE_PEDIDO,
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        importeLiquido: importeLiquidoTotal,
        numeroLineas: numeroLineas,
        deliveryDate: deliveryDate || null,
        status: getStatusText(0, 0), // Revisando
        editable: canEditOrder(0),
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
      return res.status(400).json({ 
        success: false, 
        message: 'Código de cliente no proporcionado' 
      });
    }

    const ordersResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .input('SeriePedido', SERIE_PEDIDO)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.FechaNecesaria,
          c.RazonSocial,
          c.CifDni,
          c.NumeroLineas,
          c.StatusAprobado,
          c.Estado,
          c.SeriePedido,
          c.BaseImponible,
          c.TotalIVA,
          c.ImporteLiquido,
          c.FechaEntrega,
          c.Domicilio,
          c.CodigoPostal,
          c.Municipio,
          c.Provincia,
          c.Nacion,
          c.CodigoContable
        FROM CabeceraPedidoCliente c
        WHERE c.CodigoCliente = @CodigoCliente
        AND c.SeriePedido = @SeriePedido
        ORDER BY c.FechaPedido DESC
        OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY
      `);

    // Procesar órdenes con estados correctos
    const ordersWithStatus = await Promise.all(
      ordersResult.recordset.map(async (order) => {
        try {
          const detailsResult = await pool.request()
            .input('NumeroPedido', order.NumeroPedido)
            .input('SeriePedido', order.SeriePedido)
            .query(`
              SELECT 
                l.Orden,
                l.CodigoArticulo, 
                l.DescripcionArticulo,
                l.DescripcionLinea,
                l.UnidadesPedidas,
                l.Precio,
                l.ImporteBruto,
                l.ImporteNeto,
                l.ImporteLiquido,
                l.TotalIva
              FROM LineasPedidoCliente l
              WHERE l.NumeroPedido = @NumeroPedido
              AND l.SeriePedido = @SeriePedido
              ORDER BY l.Orden
            `);

          return {
            ...order,
            EstadoTexto: getStatusText(order.StatusAprobado, order.Estado),
            Editable: canEditOrder(order.StatusAprobado),
            Productos: detailsResult.recordset
          };
        } catch (error) {
          console.error(`Error obteniendo detalles del pedido ${order.NumeroPedido}:`, error);
          return {
            ...order,
            EstadoTexto: getStatusText(order.StatusAprobado, order.Estado),
            Editable: canEditOrder(order.StatusAprobado),
            Productos: []
          };
        }
      })
    );

    return res.status(200).json({ 
      success: true, 
      orders: ordersWithStatus,
      total: ordersWithStatus.length,
      message: 'Pedidos obtenidos correctamente'
    });

  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al obtener los pedidos' 
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const pool = await getPool();
    const { numeroPedido } = req.params;
    const { codigoCliente } = req.query;

    if (!codigoCliente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros incompletos (se requiere codigoCliente)' 
      });
    }

    const orderResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('CodigoCliente', codigoCliente)
      .input('SeriePedido', SERIE_PEDIDO)
      .query(`
        SELECT 
          NumeroPedido, 
          FechaPedido, 
          RazonSocial,
          CifDni,
          StatusAprobado,
          Estado,
          SeriePedido,
          BaseImponible,
          TotalIVA,
          ImporteLiquido,
          NumeroLineas,
          FechaNecesaria,
          FechaEntrega,
          Domicilio,
          CodigoPostal,
          Municipio,
          Provincia,
          Nacion,
          CodigoContable,
          ObservacionesPedido
        FROM CabeceraPedidoCliente
        WHERE NumeroPedido = @NumeroPedido
        AND CodigoCliente = @CodigoCliente
        AND SeriePedido = @SeriePedido
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    const linesResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('SeriePedido', SERIE_PEDIDO)
      .query(`
        SELECT 
          l.Orden,
          l.CodigoArticulo, 
          l.DescripcionArticulo,
          l.DescripcionLinea,
          l.UnidadesPedidas,
          l.Precio,
          l.ImporteBruto,
          l.ImporteNeto,
          l.ImporteLiquido,
          l.TotalIva,
          l.CodigoProveedor,
          l.UnidadesRecibidas,
          l.ComentarioRecepcion,
          l.FechaRecepcion
        FROM LineasPedidoCliente l
        WHERE l.NumeroPedido = @NumeroPedido
        AND l.SeriePedido = @SeriePedido
        ORDER BY l.Orden
      `);

    // Eliminar duplicados
    const uniqueProducts = [];
    const seenKeys = new Set();
    
    linesResult.recordset.forEach(item => {
      const key = `${item.Orden}-${item.CodigoArticulo}-${item.CodigoProveedor || 'no-prov'}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueProducts.push(item);
      }
    });

    const orderData = orderResult.recordset[0];
    
    return res.status(200).json({
      success: true,
      order: {
        ...orderData,
        EstadoTexto: getStatusText(orderData.StatusAprobado, orderData.Estado),
        Editable: canEditOrder(orderData.StatusAprobado),
        Productos: uniqueProducts
      },
      message: 'Detalle del pedido obtenido correctamente'
    });

  } catch (error) {
    console.error('Error al obtener detalle del pedido:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al obtener el detalle del pedido' 
    });
  }
};

const updateOrder = async (req, res) => {
  const { orderId } = req.params;
  const { items, deliveryDate, comment } = req.body;
  
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
      // 1. Verificar que el pedido existe y está en estado editable
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', SERIE_PEDIDO)
        .query(`
          SELECT 
            CodigoEmpresa, 
            EjercicioPedido, 
            CodigoCliente,
            CifDni,
            StatusAprobado,
            Estado
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderHeader = orderResult.recordset[0];
      
      // Verificar que el pedido es editable (StatusAprobado = 0)
      if (orderHeader.StatusAprobado !== 0) {
        throw new Error('El pedido no se puede editar porque ya ha sido aprobado');
      }

      const { CodigoEmpresa, EjercicioPedido, CodigoCliente, CifDni } = orderHeader;

      // 2. Eliminar líneas existentes
      await transaction.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', orderId)
        .query(`
          DELETE FROM LineasPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      // 3. Insertar nuevas líneas del pedido
      for (const [index, item] of items.entries()) {
        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoEmpresa', CodigoEmpresa)
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

        // Obtener información de IVA
        const ivaResult = await transaction.request()
          .input('CodigoIva', item.CodigoIva || 21)
          .input('CodigoTerritorio', 0)
          .query(`
            SELECT CodigoIva, [%Iva], CodigoTerritorio
            FROM tiposiva 
            WHERE CodigoIva = @CodigoIva AND CodigoTerritorio = @CodigoTerritorio
          `);

        const tipoIva = ivaResult.recordset[0] || { CodigoIva: 21, '%Iva': 21, CodigoTerritorio: 0 };

        const unidadesPedidas = parseFloat(item.Cantidad) || 1;
        const precio = parseFloat(item.PrecioCompra) || 0;
        const porcentajeIva = parseFloat(tipoIva['%Iva']) || 21;

        const baseImponible = precio * unidadesPedidas;
        const cuotaIva = baseImponible * (porcentajeIva / 100);
        const importeLiquido = baseImponible + cuotaIva;

        await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', SERIE_PEDIDO)
          .input('NumeroPedido', orderId)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', articulo.DescripcionArticulo)
          .input('DescripcionLinea', descripcionLinea)
          .input('UnidadesPedidas', unidadesPedidas)
          .input('UnidadesPendientes', unidadesPedidas)
          .input('Unidades2_', unidadesPedidas)
          .input('UnidadesPendientesFabricar', unidadesPedidas)
          .input('Precio', precio)
          .input('ImporteBruto', baseImponible)
          .input('ImporteNeto', baseImponible)
          .input('ImporteParcial', baseImponible)
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)
          .input('CuotaIva', cuotaIva)
          .input('TotalIva', cuotaIva)
          .input('ImporteLiquido', importeLiquido)
          .input('CodigoIva', tipoIva.CodigoIva)
          .input('PorcentajeIva', porcentajeIva)
          .input('GrupoIva', tipoIva.CodigoTerritorio)
          .input('CodigoAlmacen', 'CEN')
          .input('CodigoAlmacenAnterior', 'CEN')
          .input('FechaRegistro', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('CodigoDelCliente', '')
          .input('CodigoProveedor', item.CodigoProveedor || '')
          .query(`
            INSERT INTO LineasPedidoCliente (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
              CodigoArticulo, DescripcionArticulo, DescripcionLinea,
              UnidadesPedidas, UnidadesPendientes, Unidades2_, UnidadesPendientesFabricar,
              Precio,
              ImporteBruto, ImporteNeto, ImporteParcial,
              BaseImponible, BaseIva,
              CuotaIva, TotalIva, ImporteLiquido,
              CodigoIva, [%Iva], GrupoIva,
              CodigoAlmacen, CodigoAlmacenAnterior, FechaRegistro,
              CodigoDelCliente, CodigoProveedor
            )
            VALUES (
              @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @Orden,
              @CodigoArticulo, @DescripcionArticulo, @DescripcionLinea,
              @UnidadesPedidas, @UnidadesPendientes, @Unidades2_, @UnidadesPendientesFabricar,
              @Precio,
              @ImporteBruto, @ImporteNeto, @ImporteParcial,
              @BaseImponible, @BaseIva,
              @CuotaIva, @TotalIva, @ImporteLiquido,
              @CodigoIva, @PorcentajeIva, @GrupoIva,
              @CodigoAlmacen, @CodigoAlmacenAnterior, @FechaRegistro,
              @CodigoDelCliente, @CodigoProveedor
            )
          `);
      }

      // 4. Actualizar fecha de entrega y comentarios si se proporcionan
      if (deliveryDate || comment !== undefined) {
        const updateFields = [];
        const updateParams = {
          NumeroPedido: orderId,
          SeriePedido: SERIE_PEDIDO
        };

        if (deliveryDate) {
          updateFields.push('FechaNecesaria = @FechaNecesaria');
          updateFields.push('FechaEntrega = @FechaEntrega');
          updateFields.push('FechaTope = @FechaTope');
          updateParams.FechaNecesaria = `${deliveryDate} 00:00:00.000`;
          updateParams.FechaEntrega = `${deliveryDate} 00:00:00.000`;
          updateParams.FechaTope = `${deliveryDate} 00:00:00.000`;
        }

        if (comment !== undefined) {
          updateFields.push('ObservacionesPedido = @ObservacionesPedido');
          updateParams.ObservacionesPedido = comment || '';
        }

        if (updateFields.length > 0) {
          await transaction.request()
            .input('NumeroPedido', updateParams.NumeroPedido)
            .input('SeriePedido', updateParams.SeriePedido)
            .input('FechaNecesaria', updateParams.FechaNecesaria)
            .input('FechaEntrega', updateParams.FechaEntrega)
            .input('FechaTope', updateParams.FechaTope)
            .input('ObservacionesPedido', updateParams.ObservacionesPedido)
            .query(`
              UPDATE CabeceraPedidoCliente
              SET ${updateFields.join(', ')}
              WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
            `);
        }
      }

      // 5. Recalcular totales del pedido
      const totalesResult = await transaction.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            SUM(UnidadesPedidas * Precio) AS BaseImponible,
            SUM((UnidadesPedidas * Precio) * ([%Iva] / 100.0)) AS TotalIVA,
            COUNT(*) AS NumeroLineas
          FROM LineasPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;
      const numeroLineas = parseInt(totalesResult.recordset[0].NumeroLineas) || 0;

      // 6. Actualizar cabecera con nuevos totales
      await transaction.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', orderId)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('NumeroLineas', numeroLineas)
        .query(`
          UPDATE CabeceraPedidoCliente
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

      await transaction.commit();

      return res.status(200).json({
        success: true,
        orderId: orderId,
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        importeLiquido: importeLiquidoTotal,
        numeroLineas: numeroLineas,
        status: getStatusText(0, 0), // Sigue en Revisando
        editable: true, // Sigue siendo editable
        message: 'Pedido actualizado correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción de actualización:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al actualizar el pedido' 
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderDetails,
  updateOrder,
  getStatusText,
  canEditOrder
};