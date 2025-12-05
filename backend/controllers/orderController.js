const { getPool } = require('../db/Sage200db');

const SERIE_PEDIDO = 'WebCD';

const createOrder = async (req, res) => {
  const { items, deliveryDate, comment } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'El pedido no contiene items válidos' 
    });
  }

  try {
    if (!req.user || !req.user.codigoEmpresa) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado. Inicie sesión primero.' 
      });
    }

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

      const codigoEmpresa = req.user.codigoEmpresa;

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

      const fechaActual = new Date();

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

      const condicionesPago = clienteContaResult.recordset[0] || {
        NumeroPlazos: 3,
        DiasPrimerPlazo: 30,
        DiasEntrePlazos: 30
      };

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

      const observacionesPedido = comment || '';

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
        .input('StatusAprobado', 0) 
        .input('Estado', 0)
        .input('MantenerCambio_', -1)
        .input('SiglaNacion', 'ES')
        .input('NumeroPlazos', condicionesPago.NumeroPlazos)
        .input('DiasPrimerPlazo', condicionesPago.DiasPrimerPlazo)
        .input('DiasEntrePlazos', condicionesPago.DiasEntrePlazos)
        .input('BaseImponible', 0)
        .input('TotalIva', 0)
        .input('ImporteLiquido', 0)
        .input('NumeroLineas', 0)
        .input('ObservacionesPedido', observacionesPedido)
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

      for (const [index, item] of items.entries()) {
        console.log(`🔍 Buscando artículo: ${item.CodigoArticulo} para empresa ${codigoEmpresa}`);

        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoEmpresa', codigoEmpresa)
          .query(`
            SELECT 
              DescripcionArticulo, 
              DescripcionLinea,
              PrecioVenta,
              GrupoIva,
              CodigoProveedor
            FROM Articulos
            WHERE CodigoArticulo = @CodigoArticulo
            AND CodigoEmpresa = @CodigoEmpresa
          `);

        if (articuloResult.recordset.length === 0) {
          throw new Error(`Artículo ${item.CodigoArticulo} no encontrado para la empresa ${codigoEmpresa}.`);
        }

        const articulo = articuloResult.recordset[0];
        const descripcionLinea = articulo.DescripcionLinea || '';

        const grupoIvaResult = await transaction.request()
          .input('GrupoIva', articulo.GrupoIva)
          .query(`
            SELECT TOP 1 CodigoIvasinRecargo
            FROM GrupoIva 
            WHERE GrupoIva = @GrupoIva 
            ORDER BY FechaInicio DESC
          `);

        const grupoIvaInfo = grupoIvaResult.recordset[0];
        const porcentajeIva = parseFloat(grupoIvaInfo.CodigoIvasinRecargo) || 21;
        
        const codigoIva = porcentajeIva;
        const unidadesPedidas = parseFloat(item.Cantidad) || 1;
        const precio = parseFloat(articulo.PrecioVenta) || 0;

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
          .input('ImporteBruto', importeLiquido)
          .input('ImporteNeto', baseImponible)
          .input('ImporteParcial', baseImponible)
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)
          .input('CuotaIva', cuotaIva)
          .input('TotalIva', cuotaIva)
          .input('ImporteLiquido', importeLiquido)
          .input('CodigoIva', codigoIva)
          .input('PorcentajeIva', porcentajeIva)
          .input('GrupoIva', articulo.GrupoIva)
          .input('CodigoAlmacen', codigoAlmacen)
          .input('CodigoAlmacenAnterior', codigoAlmacenAnterior)
          .input('FechaRegistro', `${fechaActual.toISOString().split('T')[0]} 00:00:00.000`)
          .input('CodigoDelCliente', '')
          .input('CodigoProveedor', articulo.CodigoProveedor || '')
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
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', numeroPedido)
        .query(`
          SELECT 
            SUM(BaseImponible) AS BaseImponible,
            SUM(TotalIva) AS TotalIVA,
            COUNT(*) AS NumeroLineas,
            SUM(ImporteLiquido) AS ImporteLiquidoTotal
          FROM LineasPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = parseFloat(totalesResult.recordset[0].ImporteLiquidoTotal) || 0;
      const numeroLineas = parseInt(totalesResult.recordset[0].NumeroLineas) || 0;

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

      console.log(`✅ Pedido ${SERIE_PEDIDO}-${numeroPedido} creado exitosamente`);

      return res.status(201).json({
        success: true,
        orderId: numeroPedido,
        seriePedido: SERIE_PEDIDO,
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        importeLiquido: importeLiquidoTotal,
        numeroLineas: numeroLineas,
        deliveryDate: deliveryDate || null,
        comment: comment,
        message: 'Pedido creado correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Error en transacción de createOrder:', err);
      throw err;
    }
  } catch (error) {
    console.error('❌ Error en createOrder:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al procesar el pedido'
    });
  }
};

const getOrders = async (req, res) => {
  try {
    if (!req.user || !req.user.codigoEmpresa) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado. Inicie sesión primero.' 
      });
    }

    const pool = await getPool();
    const { codigoCliente } = req.query;

    if (!codigoCliente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código de cliente no proporcionado' 
      });
    }

    const codigoEmpresa = req.user.codigoEmpresa;

    const ordersResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .input('SeriePedido', SERIE_PEDIDO)
      .input('CodigoEmpresa', codigoEmpresa)
      .query(`
        SELECT TOP 50
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
          c.CodigoContable,
          c.ObservacionesPedido
        FROM CabeceraPedidoCliente c
        WHERE c.CodigoCliente = @CodigoCliente
        AND c.SeriePedido = @SeriePedido
        AND c.CodigoEmpresa = @CodigoEmpresa
        ORDER BY c.FechaPedido DESC
      `);

    const ordersWithDetails = await Promise.all(
      ordersResult.recordset.map(async (order) => {
        const detailsResult = await pool.request()
          .input('NumeroPedido', order.NumeroPedido)
          .input('SeriePedido', order.SeriePedido)
          .input('CodigoEmpresa', codigoEmpresa)
          .query(`
            SELECT 
              l.Orden,
              l.CodigoArticulo, 
              l.DescripcionArticulo,
              l.DescripcionLinea,
              l.UnidadesPedidas,
              l.UnidadesRecibidas,
              l.UnidadesPendientes,
              l.Precio,
              l.ImporteBruto,
              l.ImporteNeto,
              l.ImporteLiquido,
              l.TotalIva
            FROM LineasPedidoCliente l
            WHERE l.NumeroPedido = @NumeroPedido
            AND l.SeriePedido = @SeriePedido
            AND l.CodigoEmpresa = @CodigoEmpresa
            ORDER BY l.Orden
          `);

        return {
          ...order,
          Productos: detailsResult.recordset,
          comment: order.ObservacionesPedido
        };
      })
    );

    console.log(`✅ Pedidos obtenidos: ${ordersWithDetails.length}`);

    return res.status(200).json({ 
      success: true, 
      orders: ordersWithDetails,
      total: ordersWithDetails.length,
      message: 'Pedidos obtenidos correctamente'
    });

  } catch (error) {
    console.error('❌ Error en getOrders:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al obtener los pedidos'
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    if (!req.user || !req.user.codigoEmpresa) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado. Inicie sesión primero.' 
      });
    }

    const pool = await getPool();
    const { numeroPedido } = req.params;
    const { codigoCliente, seriePedido = 'WebCD' } = req.query;

    if (!codigoCliente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros incompletos (se requiere codigoCliente)' 
      });
    }

    const codigoEmpresa = req.user.codigoEmpresa;

    const orderResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('CodigoCliente', codigoCliente)
      .input('SeriePedido', seriePedido)
      .input('CodigoEmpresa', codigoEmpresa)
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
          FechaNecesaria,
          Domicilio,
          CodigoPostal,
          Municipio,
          Provincia,
          ObservacionesPedido
        FROM CabeceraPedidoCliente
        WHERE NumeroPedido = @NumeroPedido
        AND CodigoCliente = @CodigoCliente
        AND SeriePedido = @SeriePedido
        AND CodigoEmpresa = @CodigoEmpresa
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    const order = orderResult.recordset[0];

    const linesResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('SeriePedido', seriePedido)
      .input('CodigoEmpresa', codigoEmpresa)
      .query(`
        SELECT 
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.UnidadesPendientes,
          l.Precio,
          l.ImporteBruto,
          l.ImporteNeto,
          l.ImporteLiquido,
          l.TotalIva,
          l.ComentarioRecepcion,
          l.FechaRecepcion
        FROM LineasPedidoCliente l
        WHERE l.NumeroPedido = @NumeroPedido
        AND l.SeriePedido = @SeriePedido
        AND l.CodigoEmpresa = @CodigoEmpresa
        ORDER BY l.Orden
      `);

    const uniqueProducts = [];
    const seenKeys = new Set();
    
    linesResult.recordset.forEach(item => {
      const key = `${item.Orden}-${item.CodigoArticulo}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueProducts.push(item);
      }
    });

    return res.status(200).json({
      success: true,
      order: {
        ...order,
        productos: uniqueProducts
      }
    });

  } catch (error) {
    console.error('❌ Error en getOrderDetails:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el detalle del pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateOrder = async (req, res) => {
  const { orderId } = req.params;
  const { items, deliveryDate, comment } = req.body;

  try {
    if (!req.user || !req.user.codigoEmpresa) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado. Inicie sesión primero.' 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El pedido debe contener al menos un item' 
      });
    }

    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      const codigoEmpresa = req.user.codigoEmpresa;
      const fechaActual = new Date();
      const SERIE_PEDIDO = 'WebCD';

      // 1. Verificar que el pedido existe y está en estado editable
      const pedidoExistente = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            c.NumeroPedido, c.CodigoCliente, c.StatusAprobado, c.Estado,
            c.BaseImponible, c.TotalIva, c.ImporteLiquido,
            COUNT(l.Orden) as LineasActuales
          FROM CabeceraPedidoCliente c
          LEFT JOIN LineasPedidoCliente l ON 
            c.CodigoEmpresa = l.CodigoEmpresa AND
            c.EjercicioPedido = l.EjercicioPedido AND
            c.SeriePedido = l.SeriePedido AND
            c.NumeroPedido = l.NumeroPedido
          WHERE c.CodigoEmpresa = @CodigoEmpresa
          AND c.EjercicioPedido = @EjercicioPedido
          AND c.SeriePedido = @SeriePedido
          AND c.NumeroPedido = @NumeroPedido
          GROUP BY c.NumeroPedido, c.CodigoCliente, c.StatusAprobado, c.Estado,
                   c.BaseImponible, c.TotalIva, c.ImporteLiquido
        `);

      if (pedidoExistente.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const pedido = pedidoExistente.recordset[0];

      // Verificar que el pedido está en estado editable (StatusAprobado = 0)
      if (pedido.StatusAprobado !== 0) {
        throw new Error('No se puede editar un pedido que ya ha sido aprobado');
      }

      // 2. Verificar que todos los items pertenecen al mismo cliente del pedido
      const clientesUnicos = [...new Set(items.map(item => item.CodigoCliente))];
      if (clientesUnicos.length !== 1 || clientesUnicos[0] !== pedido.CodigoCliente) {
        throw new Error('Todos los artículos deben pertenecer al cliente del pedido');
      }

      // 3. Eliminar todas las líneas existentes del pedido
      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', orderId)
        .query(`
          DELETE FROM LineasPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      // 4. Insertar las nuevas líneas
      for (const [index, item] of items.entries()) {
        // Obtener información del artículo
        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoEmpresa', codigoEmpresa)
          .query(`
            SELECT 
              DescripcionArticulo, 
              DescripcionLinea,
              PrecioVenta,
              GrupoIva,
              CodigoProveedor
            FROM Articulos
            WHERE CodigoArticulo = @CodigoArticulo
            AND CodigoEmpresa = @CodigoEmpresa
          `);

        if (articuloResult.recordset.length === 0) {
          throw new Error(`Artículo ${item.CodigoArticulo} no encontrado`);
        }

        const articulo = articuloResult.recordset[0];

        // Obtener información del IVA
        const grupoIvaResult = await transaction.request()
          .input('GrupoIva', articulo.GrupoIva)
          .query(`
            SELECT TOP 1 CodigoIvasinRecargo
            FROM GrupoIva 
            WHERE GrupoIva = @GrupoIva 
            ORDER BY FechaInicio DESC
          `);

        const grupoIvaInfo = grupoIvaResult.recordset[0];
        const porcentajeIva = parseFloat(grupoIvaInfo.CodigoIvasinRecargo) || 21;
        
        const codigoIva = porcentajeIva;
        const unidadesPedidas = parseFloat(item.Cantidad) || 1;
        const precio = parseFloat(articulo.PrecioVenta) || parseFloat(item.PrecioVenta) || 0;

        const baseImponible = precio * unidadesPedidas;
        const cuotaIva = baseImponible * (porcentajeIva / 100);
        const importeLiquido = baseImponible + cuotaIva;

        // Obtener almacenes (como en createOrder)
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

        // Insertar nueva línea
        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioPedido', fechaActual.getFullYear())
          .input('SeriePedido', SERIE_PEDIDO)
          .input('NumeroPedido', orderId)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', articulo.DescripcionArticulo || item.DescripcionArticulo)
          .input('DescripcionLinea', articulo.DescripcionLinea || '')
          .input('UnidadesPedidas', unidadesPedidas)
          .input('UnidadesPendientes', unidadesPedidas)
          .input('Unidades2_', unidadesPedidas)
          .input('UnidadesPendientesFabricar', unidadesPedidas)
          .input('Precio', precio)
          .input('ImporteBruto', importeLiquido)
          .input('ImporteNeto', baseImponible)
          .input('ImporteParcial', baseImponible)
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)
          .input('CuotaIva', cuotaIva)
          .input('TotalIva', cuotaIva)
          .input('ImporteLiquido', importeLiquido)
          .input('CodigoIva', codigoIva)
          .input('PorcentajeIva', porcentajeIva)
          .input('GrupoIva', articulo.GrupoIva)
          .input('CodigoAlmacen', codigoAlmacen)
          .input('CodigoAlmacenAnterior', codigoAlmacenAnterior)
          .input('FechaRegistro', `${fechaActual.toISOString().split('T')[0]} 00:00:00.000`)
          .input('CodigoDelCliente', '')
          .input('CodigoProveedor', articulo.CodigoProveedor || '')
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

      // 5. Recalcular totales
      const totalesResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            SUM(BaseImponible) AS BaseImponible,
            SUM(TotalIva) AS TotalIVA,
            COUNT(*) AS NumeroLineas,
            SUM(ImporteLiquido) AS ImporteLiquidoTotal
          FROM LineasPedidoCliente
          WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = parseFloat(totalesResult.recordset[0].ImporteLiquidoTotal) || 0;
      const numeroLineas = parseInt(totalesResult.recordset[0].NumeroLineas) || 0;

      // 6. Actualizar cabecera del pedido
      const fechaEntrega = deliveryDate 
        ? `${deliveryDate} 00:00:00.000`
        : pedido.FechaEntrega;

      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', fechaActual.getFullYear())
        .input('SeriePedido', SERIE_PEDIDO)
        .input('NumeroPedido', orderId)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('NumeroLineas', numeroLineas)
        .input('FechaEntrega', fechaEntrega)
        .input('FechaTope', fechaEntrega)
        .input('FechaNecesaria', fechaEntrega)
        .input('ObservacionesPedido', comment || '')
        .query(`
          UPDATE CabeceraPedidoCliente
          SET 
            BaseImponible = @BaseImponible,
            TotalIva = @TotalIVA,
            ImporteLiquido = @ImporteLiquido,
            NumeroLineas = @NumeroLineas,
            FechaEntrega = @FechaEntrega,
            FechaTope = @FechaTope,
            FechaNecesaria = @FechaNecesaria,
            ObservacionesPedido = @ObservacionesPedido
          WHERE 
            CodigoEmpresa = @CodigoEmpresa AND
            EjercicioPedido = @EjercicioPedido AND
            SeriePedido = @SeriePedido AND
            NumeroPedido = @NumeroPedido
        `);

      await transaction.commit();

      console.log(`✅ Pedido ${SERIE_PEDIDO}-${orderId} actualizado exitosamente`);

      return res.status(200).json({
        success: true,
        message: 'Pedido actualizado correctamente',
        orderId: orderId,
        itemsUpdated: items.length,
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        importeLiquido: importeLiquidoTotal,
        numeroLineas: numeroLineas,
        deliveryDate: deliveryDate,
        comment: comment
      });

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Error en transacción de updateOrder:', err);
      throw err;
    }
  } catch (error) {
    console.error('❌ Error en updateOrder:', error);
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
  updateOrder
};