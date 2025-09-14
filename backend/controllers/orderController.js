const { getPool } = require('../db/Sage200db');

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
      const clientesUnicos = [...new Set(items.map(item => item.CodigoCliente))];
      if (clientesUnicos.length !== 1) {
        throw new Error('Todos los artículos del pedido deben pertenecer al mismo cliente');
      }
      const codigoCliente = clientesUnicos[0];
      const primerItem = items[0];

      if (!codigoCliente || !primerItem.CifDni) {
        throw new Error('Datos de cliente incompletos en los items');
      }

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

      const clienteContaResult = await transaction.request()
        .input('CodigoCuenta', cliente.CodigoContable)
        .input('CodigoEmpresa', codigoEmpresa)
        .query(`
          SELECT NumeroPlazos, DiasPrimerPlazo, DiasEntrePlazos
          FROM CLIENTESCONTA
          WHERE CodigoCuenta = @CodigoCuenta AND CodigoEmpresa = @CodigoEmpresa
        `);

      // VALORES PREDETERMINADOS PARA CONDICIONES DE PAGO
      const condicionesPago = {
        NumeroPlazos: 3,
        DiasPrimerPlazo: 30,
        DiasEntrePlazos: 30
      };

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
      const fechaEntrega = deliveryDate 
        ? `${deliveryDate} 00:00:00.000`
        : fechaPedido;

      const usuarioActual = req.user?.username || 'WEB';

      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', 'Web')
        .input('NumeroPedido', numeroPedido)
        .input('FechaPedido', fechaPedido)
        .input('FechaNecesaria', fechaEntrega)
        .input('FechaEntrega', fechaEntrega)
        .input('FechaTope', fechaEntrega)
        .input('CodigoCliente', codigoCliente)
        .input('CifDni', primerItem.CifDni)
        .input('CifEuropeo', cliente.CifEuropeo || '')
        .input('RazonSocial', cliente.RazonSocial || '')
        .input('Nombre', cliente.RazonSocial || '') // Añadido: Nombre igual que RazonSocial
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
        .input('StatusAprobado', 0) 
        .input('Estado', 0) // Estado inicial: En preparación
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
        .input('CodigoCondiciones', 3) // Añadido
        .input('FormadePago', 'Tres plazos a 30, 60 y 90') // Añadido
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

      // ============================================
      // GENERACIÓN AUTOMÁTICA DEL ALBARÁN
      // ============================================
      
      // 1. Obtener el próximo número de albarán
      const nextAlbaranResult = await transaction.request()
        .input('codigoEmpresa', codigoEmpresa)
        .input('ejercicio', fechaActual.getFullYear())
        .input('serie', 'Web')
        .query(`
          SELECT ISNULL(MAX(NumeroAlbaran), 0) + 1 AS SiguienteNumero
          FROM CabeceraAlbaranCliente
          WHERE CodigoEmpresa = @codigoEmpresa
            AND EjercicioAlbaran = @ejercicio
            AND (SerieAlbaran = @serie OR (@serie = '' AND SerieAlbaran IS NULL))
        `);

      const numeroAlbaran = nextAlbaranResult.recordset[0].SiguienteNumero;

      // 2. Insertar cabecera del albarán
      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioAlbaran', fechaActual.getFullYear())
        .input('SerieAlbaran', 'Web')
        .input('NumeroAlbaran', numeroAlbaran)
        .input('FechaAlbaran', fechaActual)
        .input('CodigoCliente', codigoCliente)
        .input('RazonSocial', cliente.RazonSocial || '')
        .input('Domicilio', domicilio)
        .input('Municipio', municipio)
        .input('CodigoPostal', codigoPostal)
        .input('Provincia', provincia)
        .input('Nacion', nacion)
        .input('CodigoNacion', codigoNacion)
        .input('CodigoProvincia', codigoProvincia)
        .input('CodigoMunicipio', codigoMunicipio)
        .input('NumeroLineas', numeroLineas)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('StatusFacturado', 0)
        .input('CodigoCondiciones', 3)
        .input('FormadePago', 'Tres plazos a 30, 60 y 90')
        .input('ObservacionesAlbaran', comment || '')
        .query(`
          INSERT INTO CabeceraAlbaranCliente (
            CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran,
            FechaAlbaran, CodigoCliente, RazonSocial, Domicilio, Municipio,
            CodigoPostal, Provincia, Nacion, CodigoNacion, CodigoProvincia, CodigoMunicipio,
            NumeroLineas, ImporteLiquido, StatusFacturado,
            CodigoCondiciones, FormadePago, ObservacionesAlbaran
          ) VALUES (
            @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran,
            @FechaAlbaran, @CodigoCliente, @RazonSocial, @Domicilio, @Municipio,
            @CodigoPostal, @Provincia, @Nacion, @CodigoNacion, @CodigoProvincia, @CodigoMunicipio,
            @NumeroLineas, @ImporteLiquido, @StatusFacturado,
            @CodigoCondiciones, @FormadePago, @ObservacionesAlbaran
          )
        `);

      // 3. Insertar líneas del albarán
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

        const articulo = articuloResult.recordset[0];
        const descripcionLinea = articulo.DescripcionLinea || '';

        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', fechaActual.getFullYear())
          .input('SerieAlbaran', 'Web')
          .input('NumeroAlbaran', numeroAlbaran)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', articulo.DescripcionArticulo)
          .input('DescripcionLinea', descripcionLinea)
          .input('Unidades', item.Cantidad)
          .input('Precio', item.PrecioCompra || 0)
          .query(`
            INSERT INTO LineasAlbaranCliente (
              CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, Orden,
              CodigoArticulo, DescripcionArticulo, DescripcionLinea,
              Unidades, Precio
            ) VALUES (
              @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @Orden,
              @CodigoArticulo, @DescripcionArticulo, @DescripcionLinea,
              @Unidades, @Precio
            )
          `);
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        orderId: numeroPedido,
        seriePedido: 'Web',
        albaranId: numeroAlbaran,
        serieAlbaran: 'Web',
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        importeLiquido: importeLiquidoTotal,
        numeroLineas: numeroLineas,
        deliveryDate: deliveryDate || null,
        message: 'Pedido y albarán creados correctamente'
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
    const { codigoCliente, seriePedido } = req.query;

    if (!codigoCliente || !seriePedido) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código de cliente o serie de pedido no proporcionado' 
      });
    }

    const ordersResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .input('SeriePedido', seriePedido)
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
        OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
      `);

    const ordersWithDetails = await Promise.all(
      ordersResult.recordset.map(async (order) => {
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
          Estado: order.Estado === 0 ? 'Preparando' : 'Servido',
          Productos: detailsResult.recordset
        };
      })
    );

    return res.status(200).json({ 
      success: true, 
      orders: ordersWithDetails,
      total: ordersWithDetails.length,
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
    const { codigoCliente, seriePedido } = req.query;

    if (!codigoCliente || !seriePedido) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros incompletos (se requieren codigoCliente y seriePedido)' 
      });
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
          CodigoContable
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
      .input('SeriePedido', seriePedido)
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
          l.CodigoProveedor
        FROM LineasPedidoCliente l
        WHERE l.NumeroPedido = @NumeroPedido
        AND l.SeriePedido = @SeriePedido
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

    const orderData = orderResult.recordset[0];
    
    return res.status(200).json({
      success: true,
      order: {
        ...orderData,
        Estado: orderData.Estado === 0 ? 'Preparando' : 'Servido',
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
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'Web')
        .query(`
          SELECT 
            CodigoEmpresa, 
            EjercicioPedido, 
            CodigoCliente,
            CifDni
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderHeader = orderResult.recordset[0];
      const { CodigoEmpresa, EjercicioPedido, CodigoCliente, CifDni } = orderHeader;

      await transaction.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', 'Web')
        .input('NumeroPedido', orderId)
        .query(`
          DELETE FROM LineasPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa 
            AND EjercicioPedido = @EjercicioPedido
            AND SeriePedido = @SeriePedido
            AND NumeroPedido = @NumeroPedido
        `);

      for (const [index, item] of items.entries()) {
        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoProveedor', item.CodigoProveedor || '')
          .input('CodigoEmpresa', CodigoEmpresa)
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
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'Web')
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

      const totalesResult = await transaction.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', 'Web')
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

      await transaction.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', 'Web')
        .input('NumeroPedido', orderId)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('NumeroLineas', numeroLineas)
        .input('FechaNecesaria', deliveryDate ? `${deliveryDate} 00:00:00.000` : null)
        .input('FechaEntrega', deliveryDate ? `${deliveryDate} 00:00:00.000` : null)
        .input('FechaTope', deliveryDate ? `${deliveryDate} 00:00:00.000` : null)
        .input('ObservacionesPedido', comment || '')
        .query(`
          UPDATE CabeceraPedidoCliente
          SET 
            BaseImponible = @BaseImponible,
            TotalIva = @TotalIVA,
            ImporteLiquido = @ImporteLiquido,
            NumeroLineas = @NumeroLineas,
            FechaNecesaria = @FechaNecesaria,
            FechaEntrega = @FechaEntrega,
            FechaTope = @FechaTope,
            ObservacionesPedido = @ObservacionesPedido
          WHERE 
            CodigoEmpresa = @CodigoEmpresa AND
            EjercicioPedido = @EjercicioPedido AND
            SeriePedido = @SeriePedido AND
            NumeroPedido = @NumeroPedido
        `);

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Pedido actualizado correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al procesar la actualización del pedido' 
    });
  }
};

module.exports = { 
  createOrder, 
  getOrders, 
  getOrderDetails,
  updateOrder 
};