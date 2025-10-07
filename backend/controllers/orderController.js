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

      // Declarar fechaActual aquí, antes de cualquier uso
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

      // Función para obtener el valor preferente (cliente_proveedor o cliente)
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

      // Valores predeterminados para condiciones de pago
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

      // CORREGIDO: Ahora el comentario se guarda correctamente en ObservacionesPedido
      const observacionesPedido = comment || '';
      console.log('Guardando comentario en ObservacionesPedido:', observacionesPedido);

      // Insertar cabecera del pedido
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
        .input('ObservacionesPedido', observacionesPedido) // CORREGIDO: Se guarda el comentario
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
        // CORREGIDO: Obtener PrecioVenta y CodigoIva del artículo
        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoProveedor', item.CodigoProveedor || '')
          .input('CodigoEmpresa', codigoEmpresa)
          .query(`
            SELECT 
              DescripcionArticulo, 
              DescripcionLinea,
              PrecioVenta,  -- CAMBIADO: PrecioCompra por PrecioVenta
              CodigoIva     -- IMPORTANTE: Obtener el código de IVA del artículo
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

        // CORREGIDO: Obtener información de IVA del ARTÍCULO, no del item
        const ivaResult = await transaction.request()
          .input('CodigoIva', articulo.CodigoIva)  // CAMBIADO: Usar el código de IVA del artículo
          .input('CodigoTerritorio', 0)
          .query(`
            SELECT CodigoIva, [%Iva], CodigoTerritorio
            FROM tiposiva 
            WHERE CodigoIva = @CodigoIva AND CodigoTerritorio = @CodigoTerritorio
          `);

        if (ivaResult.recordset.length === 0) {
          throw new Error(`Tipo de IVA ${articulo.CodigoIva} no encontrado para el artículo ${item.CodigoArticulo}`);
        }

        const tipoIva = ivaResult.recordset[0];

        const unidadesPedidas = parseFloat(item.Cantidad) || 1;
        // CAMBIADO: Usar PrecioVenta del artículo en lugar de PrecioCompra del item
        const precio = parseFloat(articulo.PrecioVenta) || 0;
        const porcentajeIva = parseFloat(tipoIva['%Iva']) || 21;

        // Cálculos CORREGIDOS
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
          .input('Precio', precio)  // Este precio ahora es PrecioVenta (con IVA incluido)
          .input('ImporteBruto', importeLiquido)  // Total con IVA
          .input('ImporteNeto', baseImponible)    // Base imponible (sin IVA)
          .input('ImporteParcial', baseImponible)
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)
          .input('CuotaIva', cuotaIva)
          .input('TotalIva', cuotaIva)
          .input('ImporteLiquido', importeLiquido)  // Total con IVA
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

      // CORREGIDO: Recalcular totales del pedido
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
        comment: comment, // CORREGIDO: Incluir el comentario en la respuesta
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

    // CONSULTA CORREGIDA: Incluir Estado y StatusAprobado para calcular el Status
    const ordersResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .input('SeriePedido', SERIE_PEDIDO)
      .query(`
        SELECT TOP 50
          c.NumeroPedido,
          c.FechaPedido,
          c.FechaNecesaria,
          c.RazonSocial,
          c.CifDni,
          c.NumeroLineas,
          c.StatusAprobado,
          c.Estado,  -- IMPORTANTE: Incluir Estado
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
        ORDER BY c.FechaPedido DESC
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
              l.UnidadesRecibidas,  -- IMPORTANTE: Incluir UnidadesRecibidas
              l.UnidadesPendientes, -- IMPORTANTE: Incluir UnidadesPendientes
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
          // NO sobrescribir Estado aquí, dejar que el frontend calcule el Status
          Productos: detailsResult.recordset,
          comment: order.ObservacionesPedido
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
    const { codigoCliente, seriePedido = 'WebCD' } = req.query;

    if (!codigoCliente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros incompletos (se requiere codigoCliente)' 
      });
    }

    console.log('Buscando pedido:', { numeroPedido, codigoCliente, seriePedido });

    // Cabecera del pedido - CONSULTA CORREGIDA
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
          Estado,  -- IMPORTANTE: Incluir Estado
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
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    const order = orderResult.recordset[0];

    // Líneas del pedido - CONSULTA CORREGIDA
    const linesResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('SeriePedido', seriePedido)
      .query(`
        SELECT 
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,  -- IMPORTANTE: Incluir UnidadesRecibidas
          l.UnidadesPendientes, -- IMPORTANTE: Incluir UnidadesPendientes
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
        ORDER BY l.Orden
      `);

    console.log(`Encontradas ${linesResult.recordset.length} líneas para el pedido ${numeroPedido}`);

    // Eliminar duplicados
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
    console.error('Error al obtener detalle del pedido:', error);
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
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Obtener información del pedido actual
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', SERIE_PEDIDO)
        .query(`
          SELECT CodigoEmpresa, EjercicioPedido, CodigoCliente
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const { CodigoEmpresa, EjercicioPedido, CodigoCliente } = orderResult.recordset[0];

      // 2. Eliminar todas las líneas existentes del pedido
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', SERIE_PEDIDO)
        .query(`
          DELETE FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      // 3. Insertar las nuevas líneas del pedido
      for (const [index, item] of items.entries()) {
        // CORREGIDO: Obtener PrecioVenta y CodigoIva del artículo
        const articuloResult = await transaction.request()
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('CodigoEmpresa', CodigoEmpresa)
          .query(`
            SELECT 
              DescripcionArticulo, 
              DescripcionLinea,
              PrecioVenta,  -- CAMBIADO: PrecioCompra por PrecioVenta
              CodigoIva     -- IMPORTANTE: Obtener el código de IVA del artículo
            FROM Articulos
            WHERE CodigoArticulo = @CodigoArticulo
            AND CodigoEmpresa = @CodigoEmpresa
          `);

        if (articuloResult.recordset.length === 0) {
          throw new Error(`Artículo ${item.CodigoArticulo} no encontrado`);
        }

        const articulo = articuloResult.recordset[0];
        const descripcionLinea = articulo.DescripcionLinea || '';

        // CORREGIDO: Obtener información de IVA del ARTÍCULO
        const ivaResult = await transaction.request()
          .input('CodigoIva', articulo.CodigoIva)  // CAMBIADO: Usar el código de IVA del artículo
          .input('CodigoTerritorio', 0)
          .query(`
            SELECT CodigoIva, [%Iva], CodigoTerritorio
            FROM tiposiva 
            WHERE CodigoIva = @CodigoIva AND CodigoTerritorio = @CodigoTerritorio
          `);

        const tipoIva = ivaResult.recordset[0] || { CodigoIva: 21, '%Iva': 21, CodigoTerritorio: 0 };

        const unidadesPedidas = parseFloat(item.Cantidad) || 1;
        // CAMBIADO: Usar PrecioVenta del artículo
        const precio = parseFloat(articulo.PrecioVenta) || 0;
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
          .input('Precio', precio)  // Este precio ahora es PrecioVenta (con IVA incluido)
          .input('ImporteBruto', importeLiquido)  // Total con IVA
          .input('ImporteNeto', baseImponible)    // Base imponible (sin IVA)
          .input('ImporteParcial', baseImponible)
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)
          .input('CuotaIva', cuotaIva)
          .input('TotalIva', cuotaIva)
          .input('ImporteLiquido', importeLiquido)  // Total con IVA
          .input('CodigoIva', tipoIva.CodigoIva)
          .input('PorcentajeIva', porcentajeIva)
          .input('GrupoIva', tipoIva.CodigoTerritorio)
          .input('CodigoAlmacen', 'CEN')
          .input('CodigoAlmacenAnterior', 'CEN')
          .input('FechaRegistro', new Date())
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

      // 4. Actualizar fecha de entrega y comentario si se proporcionan
      if (deliveryDate || comment) {
        let updateQuery = 'UPDATE CabeceraPedidoCliente SET ';
        const updateParams = {};
        
        if (deliveryDate) {
          updateQuery += 'FechaNecesaria = @FechaNecesaria, FechaEntrega = @FechaEntrega, ';
          updateParams.FechaNecesaria = `${deliveryDate} 00:00:00.000`;
          updateParams.FechaEntrega = `${deliveryDate} 00:00:00.000`;
        }
        
        if (comment) {
          updateQuery += 'ObservacionesPedido = @ObservacionesPedido, ';
          updateParams.ObservacionesPedido = comment;
        }
        
        // Eliminar la última coma y espacio
        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ' WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido';
        
        updateParams.NumeroPedido = orderId;
        updateParams.SeriePedido = SERIE_PEDIDO;
        
        const updateRequest = transaction.request();
        Object.keys(updateParams).forEach(key => {
          updateRequest.input(key, updateParams[key]);
        });
        
        await updateRequest.query(updateQuery);
      }

      // 5. CORREGIDO: Recalcular totales del pedido
      const totalesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', SERIE_PEDIDO)
        .query(`
          SELECT 
            SUM(BaseImponible) AS BaseImponible,
            SUM(TotalIva) AS TotalIVA,
            COUNT(*) AS NumeroLineas,
            SUM(ImporteLiquido) AS ImporteLiquidoTotal
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = parseFloat(totalesResult.recordset[0].ImporteLiquidoTotal) || 0;
      const numeroLineas = parseInt(totalesResult.recordset[0].NumeroLineas) || 0;

      // 6. Actualizar cabecera con nuevos totales
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', SERIE_PEDIDO)
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
            NumeroPedido = @NumeroPedido AND
            SeriePedido = @SeriePedido
        `);

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Pedido actualizado correctamente',
        orderId: orderId,
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        importeLiquido: importeLiquidoTotal,
        numeroLineas: numeroLineas
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
  updateOrder
};