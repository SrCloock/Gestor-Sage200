const { getPool } = require('../db/Sage200db');

const getPendingOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      cliente,
      estado,
      fechaDesde,
      fechaHasta,
      ordenarPor = 'FechaPedido',
      orden = 'DESC'
    } = req.query;

    const pool = await getPool();
    
    // Construir condiciones WHERE dinámicamente
    let whereConditions = ["SeriePedido = 'WebCD'"];
    let inputParams = {};
    
    if (cliente) {
      whereConditions.push('RazonSocial LIKE @cliente');
      inputParams.cliente = `%${cliente}%`;
    }
    
    if (estado !== undefined) {
      whereConditions.push('StatusAprobado = @estado');
      inputParams.estado = parseInt(estado);
    } else {
      // Por defecto, solo pendientes (StatusAprobado = 0)
      whereConditions.push('StatusAprobado = 0');
    }
    
    if (fechaDesde) {
      whereConditions.push('CONVERT(DATE, FechaPedido) >= @fechaDesde');
      inputParams.fechaDesde = fechaDesde;
    }
    
    if (fechaHasta) {
      whereConditions.push('CONVERT(DATE, FechaPedido) <= @fechaHasta');
      inputParams.fechaHasta = fechaHasta;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validar parámetros de ordenación
    const columnasPermitidas = ['NumeroPedido', 'FechaPedido', 'RazonSocial', 'CifDni', 'NumeroLineas', 'StatusAprobado', 'BaseImponible', 'FechaNecesaria'];
    const ordenPermitido = ['ASC', 'DESC'];
    
    const ordenarPorValido = columnasPermitidas.includes(ordenarPor) ? ordenarPor : 'FechaPedido';
    const ordenValido = ordenPermitido.includes(orden.toUpperCase()) ? orden.toUpperCase() : 'DESC';
    
    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    
    // Consulta para los datos
    let query = `
      SELECT 
        NumeroPedido,
        FechaPedido,
        RazonSocial,
        CifDni,
        NumeroLineas,
        StatusAprobado,
        SeriePedido,
        BaseImponible,
        FechaNecesaria,
        ObservacionesPedido,
        CodigoCliente
      FROM CabeceraPedidoCliente
      ${whereClause}
      ORDER BY ${ordenarPorValido} ${ordenValido}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    
    let request = pool.request();
    
    // Agregar parámetros a la solicitud
    Object.keys(inputParams).forEach(key => {
      request = request.input(key, inputParams[key]);
    });
    
    const result = await request.query(query);
    
    // Consulta para el total de registros (para paginación)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM CabeceraPedidoCliente
      ${whereClause}
    `;
    
    let countRequest = pool.request();
    Object.keys(inputParams).forEach(key => {
      countRequest = countRequest.input(key, inputParams[key]);
    });
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    const totalPaginas = Math.ceil(total / limit);

    console.log('Pedidos encontrados:', result.recordset.length);

    res.status(200).json({
      success: true,
      orders: result.recordset,
      paginacion: {
        pagina: parseInt(page),
        porPagina: parseInt(limit),
        total,
        totalPaginas
      }
    });
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener pedidos pendientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getOrderForReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = await getPool();

    const orderResult = await pool.request()
      .input('NumeroPedido', orderId)
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          c.CifDni,
          c.Domicilio,
          c.CodigoPostal,
          c.Municipio,
          c.Provincia,
          c.StatusAprobado,
          c.Estado,
          c.ObservacionesPedido,
          c.FechaNecesaria,
          c.CodigoEmpresa,
          c.EjercicioPedido,
          CASE 
            WHEN c.StatusAprobado = 0 THEN 'Pendiente'
            WHEN c.StatusAprobado = -1 AND (c.Estado IS NULL OR c.Estado = 0) THEN 'Preparación'
            WHEN c.StatusAprobado = -1 AND c.Estado = 1 THEN 'Parcial'
            WHEN c.StatusAprobado = -1 AND c.Estado = 2 THEN 'Servido'
            ELSE 'Desconocido'
          END as Status
        FROM CabeceraPedidoCliente c
        WHERE c.NumeroPedido = @NumeroPedido
        AND c.SeriePedido = @SeriePedido
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    const linesResult = await pool.request()
      .input('NumeroPedido', orderId)
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT DISTINCT
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.Precio,
          l.CodigoProveedor,
          l.CodigoIva,
          t.[%Iva] as PorcentajeIva,
          COALESCE(p.RazonSocial, 'No especificado') as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
        LEFT JOIN tiposiva t ON l.CodigoIva = t.CodigoIva AND t.CodigoTerritorio = 0
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

    res.status(200).json({
      success: true,
      order: {
        ...orderResult.recordset[0],
        Productos: uniqueProducts
      }
    });
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función para generar albarán de cliente
const generarAlbaranCliente = async (transaction, orderHeader, items) => {
  const { CodigoEmpresa, EjercicioPedido, CodigoCliente, RazonSocial, Domicilio, Municipio, Provincia } = orderHeader;

  // Obtener el próximo número de albarán
  const albaranResult = await transaction.request()
    .input('CodigoEmpresa', CodigoEmpresa)
    .input('EjercicioAlbaran', EjercicioPedido)
    .input('SerieAlbaran', 'WebCD')
    .query(`
      SELECT ISNULL(MAX(NumeroAlbaran), 0) + 1 AS SiguienteNumero
      FROM CabeceraAlbaranCliente
      WHERE CodigoEmpresa = @CodigoEmpresa
        AND EjercicioAlbaran = @EjercicioAlbaran
        AND SerieAlbaran = @SerieAlbaran
    `);

  const numeroAlbaran = albaranResult.recordset[0].SiguienteNumero;
  const fechaActual = new Date();

  // Calcular totales
  let baseImponibleTotal = 0;
  let totalIVATotal = 0;

  items.forEach(item => {
    const precio = item.Precio || 0;
    const unidades = item.UnidadesPedidas || 0;
    const porcentajeIva = item.PorcentajeIva || 21;

    const importeLinea = unidades * precio;
    const ivaLinea = importeLinea * porcentajeIva / 100;

    baseImponibleTotal += importeLinea;
    totalIVATotal += ivaLinea;
  });

  const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

  // Insertar cabecera del albarán
  await transaction.request()
    .input('CodigoEmpresa', CodigoEmpresa)
    .input('EjercicioAlbaran', EjercicioPedido)
    .input('SerieAlbaran', 'WebCD')
    .input('NumeroAlbaran', numeroAlbaran)
    .input('CodigoCliente', CodigoCliente)
    .input('RazonSocial', RazonSocial)
    .input('Domicilio', Domicilio || '')
    .input('Municipio', Municipio || '')
    .input('Provincia', Provincia || '')
    .input('FechaAlbaran', fechaActual)
    .input('NumeroLineas', items.length)
    .input('BaseImponible', baseImponibleTotal)
    .input('TotalIVA', totalIVATotal)
    .input('ImporteLiquido', importeLiquidoTotal)
    .input('StatusFacturado', 0)
    .query(`
      INSERT INTO CabeceraAlbaranCliente (
        CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran,
        CodigoCliente, RazonSocial, Domicilio, Municipio, Provincia,
        FechaAlbaran, NumeroLineas, BaseImponible, TotalIVA, ImporteLiquido,
        StatusFacturado
      ) VALUES (
        @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran,
        @CodigoCliente, @RazonSocial, @Domicilio, @Municipio, @Provincia,
        @FechaAlbaran, @NumeroLineas, @BaseImponible, @TotalIVA, @ImporteLiquido,
        @StatusFacturado
      )
    `);

  // Insertar líneas del albarán
  for (const [index, item] of items.entries()) {
    const precio = item.Precio || 0;
    const unidades = item.UnidadesPedidas || 0;
    const porcentajeIva = item.PorcentajeIva || 21;

    const importeLinea = unidades * precio;
    const ivaLinea = importeLinea * porcentajeIva / 100;
    const importeLiquido = importeLinea + ivaLinea;

    await transaction.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioAlbaran', EjercicioPedido)
      .input('SerieAlbaran', 'WebCD')
      .input('NumeroAlbaran', numeroAlbaran)
      .input('Orden', index + 1)
      .input('CodigoArticulo', item.CodigoArticulo)
      .input('DescripcionArticulo', item.DescripcionArticulo)
      .input('Unidades', unidades)
      .input('Precio', precio)
      .input('BaseImponible', importeLinea)
      .input('PorcentajeIva', porcentajeIva)
      .input('CuotaIva', ivaLinea)
      .input('ImporteLiquido', importeLiquido)
      .query(`
        INSERT INTO LineasAlbaranCliente (
          CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, Orden,
          CodigoArticulo, DescripcionArticulo, Unidades, Precio,
          BaseImponible, [%Iva], CuotaIva, ImporteLiquido
        ) VALUES (
          @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @Orden,
          @CodigoArticulo, @DescripcionArticulo, @Unidades, @Precio,
          @BaseImponible, @PorcentajeIva, @CuotaIva, @ImporteLiquido
        )
      `);
  }

  return numeroAlbaran;
};


// Función para generar albarán de proveedor
const generarAlbaranProveedor = async (transaction, orderHeader, proveedor, itemsProveedor, numeroPedidoProveedor) => {
  const { CodigoEmpresa, EjercicioPedido } = orderHeader;

  // Validación mejorada del proveedor
  if (!proveedor || !proveedor.CodigoProveedor) {
    console.warn('Proveedor no especificado, usando proveedor por defecto');
    proveedor = {
      CodigoProveedor: 'DEFAULT',
      RazonSocial: 'Proveedor No Especificado',
      Domicilio: '',
      Municipio: '',
      Provincia: '',
      // Agregar campos adicionales necesarios
      Nombre: 'Proveedor No Especificado',
      CifDni: '',
      CifEuropeo: '',
      CodigoPostal: '',
      CodigoMunicipio: '',
      CodigoProvincia: '',
      CodigoNacion: '108',
      Nacion: 'ESPAÑA',
      CodigoCondiciones: 0,
      FormadePago: '',
      CodigoContable: orderHeader.CodigoContable || '',
      CodigoIdioma_: 'ESP',
      MantenerCambio_: 0,
      CodigoContableANT_: orderHeader.CodigoContable || ''
    };
  }

  const { CodigoProveedor, RazonSocial, Domicilio, Municipio, Provincia } = proveedor;

  // Obtener el próximo número de albarán
  const albaranResult = await transaction.request()
    .input('CodigoEmpresa', CodigoEmpresa)
    .input('EjercicioAlbaran', EjercicioPedido)
    .input('SerieAlbaran', 'WebCD')
    .query(`
      SELECT ISNULL(MAX(NumeroAlbaran), 0) + 1 AS SiguienteNumero
      FROM CabeceraAlbaranProveedor
      WHERE CodigoEmpresa = @CodigoEmpresa
        AND EjercicioAlbaran = @EjercicioAlbaran
        AND SerieAlbaran = @SerieAlbaran
    `);

  const numeroAlbaran = albaranResult.recordset[0].SiguienteNumero;
  const fechaActual = new Date();

  // Calcular totales
  let baseImponibleTotal = 0;
  let totalIVATotal = 0;

  itemsProveedor.forEach(item => {
    const precio = item.Precio || 0;
    const unidades = item.UnidadesPedidas || 0;
    const porcentajeIva = item.PorcentajeIva || 21;

    const importeLinea = unidades * precio;
    const ivaLinea = importeLinea * porcentajeIva / 100;

    baseImponibleTotal += importeLinea;
    totalIVATotal += ivaLinea;
  });

  const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

  // Insertar cabecera del albarán
  await transaction.request()
    .input('CodigoEmpresa', CodigoEmpresa)
    .input('EjercicioAlbaran', EjercicioPedido)
    .input('SerieAlbaran', 'WebCD')
    .input('NumeroAlbaran', numeroAlbaran)
    .input('CodigoProveedor', CodigoProveedor)
    .input('RazonSocial', RazonSocial)
    .input('Domicilio', Domicilio || '')
    .input('Municipio', Municipio || '')
    .input('Provincia', Provincia || '')
    .input('FechaAlbaran', fechaActual)
    .input('NumeroLineas', itemsProveedor.length)
    .input('BaseImponible', baseImponibleTotal)
    .input('TotalIVA', totalIVATotal)
    .input('ImporteLiquido', importeLiquidoTotal)
    .input('StatusFacturado', 0)
    .query(`
      INSERT INTO CabeceraAlbaranProveedor (
        CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran,
        CodigoProveedor, RazonSocial, Domicilio, Municipio, Provincia,
        FechaAlbaran, NumeroLineas, BaseImponible, TotalIVA, ImporteLiquido,
        StatusFacturado
      ) VALUES (
        @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran,
        @CodigoProveedor, @RazonSocial, @Domicilio, @Municipio, @Provincia,
        @FechaAlbaran, @NumeroLineas, @BaseImponible, @TotalIVA, @ImporteLiquido,
        @StatusFacturado
      )
    `);

  // Insertar líneas del albarán
  for (const [index, item] of itemsProveedor.entries()) {
    const precio = item.Precio || 0;
    const unidades = item.UnidadesPedidas || 0;
    const porcentajeIva = item.PorcentajeIva || 21;

    const importeLinea = unidades * precio;
    const ivaLinea = importeLinea * porcentajeIva / 100;
    const importeLiquido = importeLinea + ivaLinea;

    await transaction.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioAlbaran', EjercicioPedido)
      .input('SerieAlbaran', 'WebCD')
      .input('NumeroAlbaran', numeroAlbaran)
      .input('Orden', index + 1)
      .input('CodigoArticulo', item.CodigoArticulo)
      .input('DescripcionArticulo', item.DescripcionArticulo)
      .input('Unidades', unidades)
      .input('Precio', precio)
      .input('BaseImponible', importeLinea)
      .input('PorcentajeIva', porcentajeIva)
      .input('CuotaIva', ivaLinea)
      .input('ImporteLiquido', importeLiquido)
      .query(`
        INSERT INTO LineasAlbaranProveedor (
          CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, Orden,
          CodigoArticulo, DescripcionArticulo, Unidades, Precio,
          BaseImponible, [%Iva], CuotaIva, ImporteLiquido
        ) VALUES (
          @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @Orden,
          @CodigoArticulo, @DescripcionArticulo, @Unidades, @Precio,
          @BaseImponible, @PorcentajeIva, @CuotaIva, @ImporteLiquido
        )
      `);
  }

  return numeroAlbaran;
};



const updateOrderQuantitiesAndApprove = async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Obtener información completa del pedido
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            CodigoEmpresa, 
            EjercicioPedido, 
            CodigoCliente,
            CifDni,
            RazonSocial,
            Domicilio,
            CodigoPostal,
            Municipio,
            Provincia,
            IdDelegacion,
            CodigoContable
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderHeader = orderResult.recordset[0];
      const { CodigoEmpresa, EjercicioPedido, CodigoCliente, CifDni, RazonSocial, Domicilio, CodigoPostal, Municipio, Provincia, IdDelegacion, CodigoContable } = orderHeader;

      // 2. Actualizar cantidades en LineasPedidoCliente
      for (const item of items) {
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .input('Orden', item.Orden)
          .input('UnidadesPedidas', item.UnidadesPedidas)
          .input('UnidadesPendientes', item.UnidadesPedidas)
          .input('Unidades2_', item.UnidadesPedidas)
          .input('UnidadesPendientesFabricar', item.UnidadesPedidas)
          .query(`
            UPDATE LineasPedidoCliente 
            SET 
              UnidadesPedidas = @UnidadesPedidas,
              UnidadesPendientes = @UnidadesPendientes,
              Unidades2_ = @Unidades2_,
              UnidadesPendientesFabricar = @UnidadesPendientesFabricar
            WHERE NumeroPedido = @NumeroPedido 
            AND SeriePedido = @SeriePedido 
            AND Orden = @Orden
          `);
      }

      // 3. Recalcular totales del pedido
      const totalesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            SUM(UnidadesPedidas * Precio) AS BaseImponible,
            SUM((UnidadesPedidas * Precio) * (t.[%Iva] / 100.0)) AS TotalIVA
          FROM LineasPedidoCliente l
          LEFT JOIN tiposiva t ON l.CodigoIva = t.CodigoIva AND t.CodigoTerritorio = 0
          WHERE l.NumeroPedido = @NumeroPedido
          AND l.SeriePedido = @SeriePedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

      // 4. Actualizar cabecera con nuevos totales y estado
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('StatusAprobado', -1)
        .input('Estado', 0)
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET 
            BaseImponible = @BaseImponible,
            TotalIva = @TotalIVA,
            ImporteLiquido = @ImporteLiquido,
            StatusAprobado = @StatusAprobado,
            Estado = @Estado
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      // 5. Generar albarán para el cliente
      const numeroAlbaranCliente = await generarAlbaranCliente(transaction, orderHeader, items);
      console.log(`Albarán de cliente generado: ${numeroAlbaranCliente}`);

      // 6. Crear pedidos a proveedores (agrupados por proveedor)
      const pedidosPorProveedor = {};
      
      // Agrupar items por proveedor
      for (const item of items) {
        const proveedor = item.CodigoProveedor || 'DEFAULT';
        if (!pedidosPorProveedor[proveedor]) {
          pedidosPorProveedor[proveedor] = [];
        }
        pedidosPorProveedor[proveedor].push(item);
      }

      // Obtener el próximo número de pedido para proveedores
      let numeroPedidoProveedor = 1;
      
      const contadorResult = await transaction.request()
        .input('sysGrupo', CodigoEmpresa)
        .input('sysNombreContador', 'PEDIDOS_PRO')
        .input('sysNumeroSerie', 'WebCD')
        .query(`
          SELECT sysContadorValor 
          FROM LSYSCONTADORES
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = @sysNombreContador
          AND (sysNumeroSerie = @sysNumeroSerie OR sysNumeroSerie IS NULL)
        `);

      if (contadorResult.recordset.length > 0) {
        numeroPedidoProveedor = contadorResult.recordset[0].sysContadorValor + 1;
      } else {
        const maxResult = await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'WebCD')
          .query(`
            SELECT MAX(NumeroPedido) as MaxNumero
            FROM CabeceraPedidoProveedor
            WHERE CodigoEmpresa = @CodigoEmpresa
            AND EjercicioPedido = @EjercicioPedido
            AND SeriePedido = @SeriePedido
          `);

        numeroPedidoProveedor = (maxResult.recordset[0].MaxNumero || 0) + 1;
        
        await transaction.request()
          .input('sysGrupo', CodigoEmpresa)
          .input('sysNombreContador', 'PEDIDOS_PRO')
          .input('sysNumeroSerie', 'WebCD')
          .input('sysContadorValor', numeroPedidoProveedor)
          .query(`
            INSERT INTO LSYSCONTADORES (sysGrupo, sysNombreContador, sysNumeroSerie, sysContadorValor)
            VALUES (@sysGrupo, @sysNombreContador, @sysNumeroSerie, @sysContadorValor)
          `);
      }

      // Crear un pedido por cada proveedor
      for (const [codigoProveedor, itemsProveedor] of Object.entries(pedidosPorProveedor)) {
        // Obtener información básica del proveedor
        const proveedorResult = await transaction.request()
          .input('CodigoProveedor', codigoProveedor)
          .query(`
            SELECT 
              RazonSocial, 
              Nombre,
              CifDni,
              CifEuropeo,
              Domicilio,
              CodigoPostal,
              CodigoMunicipio,
              Municipio,
              CodigoProvincia,
              Provincia,
              CodigoNacion,
              Nacion,
              CodigoCondiciones,
              FormadePago,
              CodigoContable,
              CodigoIdioma_,
              MantenerCambio_,
              CodigoContableANT_
            FROM Proveedores
            WHERE CodigoProveedor = @CodigoProveedor
          `);

        const proveedor = proveedorResult.recordset[0] || {
          RazonSocial: 'Proveedor No Especificado',
          Nombre: 'Proveedor No Especificado',
          CifDni: '',
          CifEuropeo: '',
          Domicilio: '',
          CodigoPostal: '',
          CodigoMunicipio: '',
          Municipio: '',
          CodigoProvincia: '',
          Provincia: '',
          CodigoNacion: '108',
          Nacion: 'ESPAÑA',
          CodigoCondiciones: 0,
          FormadePago: '',
          CodigoContable: CodigoContable || '',
          CodigoIdioma_: 'ESP',
          MantenerCambio_: 0,
          CodigoContableANT_: CodigoContable || ''
        };

        // Verificar si ya existe un pedido con este número
        const existePedido = await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'WebCD')
          .input('NumeroPedido', numeroPedidoProveedor)
          .query(`
            SELECT COUNT(*) as Existe
            FROM CabeceraPedidoProveedor
            WHERE CodigoEmpresa = @CodigoEmpresa
            AND EjercicioPedido = @EjercicioPedido
            AND SeriePedido = @SeriePedido
            AND NumeroPedido = @NumeroPedido
          `);

        if (existePedido.recordset[0].Existe > 0) {
          let nuevoNumero = numeroPedidoProveedor + 1;
          let existeNuevo = await transaction.request()
            .input('CodigoEmpresa', CodigoEmpresa)
            .input('EjercicioPedido', EjercicioPedido)
            .input('SeriePedido', 'WebCD')
            .input('NumeroPedido', nuevoNumero)
            .query(`
              SELECT COUNT(*) as Existe
              FROM CabeceraPedidoProveedor
              WHERE CodigoEmpresa = @CodigoEmpresa
              AND EjercicioPedido = @EjercicioPedido
              AND SeriePedido = @SeriePedido
              AND NumeroPedido = @NumeroPedido
            `);

          while (existeNuevo.recordset[0].Existe > 0) {
            nuevoNumero++;
            existeNuevo = await transaction.request()
              .input('CodigoEmpresa', CodigoEmpresa)
              .input('EjercicioPedido', EjercicioPedido)
              .input('SeriePedido', 'WebCD')
              .input('NumeroPedido', nuevoNumero)
              .query(`
                SELECT COUNT(*) as Existe
                FROM CabeceraPedidoProveedor
                WHERE CodigoEmpresa = @CodigoEmpresa
                AND EjercicioPedido = @EjercicioPedido
                AND SeriePedido = @SeriePedido
                AND NumeroPedido = @NumeroPedido
              `);
          }
          
          numeroPedidoProveedor = nuevoNumero;
        }

        // Agregar observación con el formato "Pedido X de [Razón Social]"
        const observacionesPedido = `Pedido ${orderId} de ${RazonSocial}`;

        // Insertar cabecera del pedido a proveedor
        await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'WebCD')
          .input('NumeroPedido', numeroPedidoProveedor)
          .input('IdDelegacion', IdDelegacion || '')
          .input('CodigoProveedor', codigoProveedor)
          .input('SiglaNacion', 'ES')
          .input('CifDni', proveedor.CifDni)
          .input('CifEuropeo', proveedor.CifEuropeo || '')
          .input('RazonSocial', proveedor.RazonSocial)
          .input('Nombre', proveedor.Nombre || proveedor.RazonSocial)
          .input('Domicilio', proveedor.Domicilio || '')
          .input('CodigoPostal', proveedor.CodigoPostal || '')
          .input('CodigoMunicipio', proveedor.CodigoMunicipio || '')
          .input('Municipio', proveedor.Municipio || '')
          .input('CodigoProvincia', proveedor.CodigoProvincia || '')
          .input('Provincia', proveedor.Provincia || '')
          .input('CodigoNacion', proveedor.CodigoNacion || '108')
          .input('Nacion', proveedor.Nacion || 'ESPAÑA')
          .input('CodigoCondiciones', proveedor.CodigoCondiciones || 0)
          .input('FormadePago', proveedor.FormadePago || '')
          .input('CodigoContable', proveedor.CodigoContable || '')
          .input('ObservacionesPedido', observacionesPedido)
          .input('FechaPedido', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('FechaNecesaria', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('FechaRecepcion', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('FechaTope', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('StatusAprobado', -1)
          .input('BaseImponible', 0)
          .input('TotalIVA', 0)
          .input('ImporteLiquido', 0)
          .input('NumeroLineas', itemsProveedor.length)
          .input('CodigoIdioma_', proveedor.CodigoIdioma_ || 'ESP')
          .input('MantenerCambio_', proveedor.MantenerCambio_ || 0)
          .input('CodigoContableANT_', proveedor.CodigoContableANT_ || '')
          .query(`
            INSERT INTO CabeceraPedidoProveedor (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, IdDelegacion,
              CodigoProveedor, SiglaNacion, CifDni, CifEuropeo, RazonSocial, Nombre,
              Domicilio, CodigoPostal, CodigoMunicipio, Municipio, CodigoProvincia, Provincia,
              CodigoNacion, Nacion, CodigoCondiciones, FormadePago,
              CodigoContable, ObservacionesPedido, FechaPedido, FechaNecesaria, FechaRecepcion, FechaTope,
              StatusAprobado, BaseImponible, TotalIva, ImporteLiquido, NumeroLineas,
              CodigoIdioma_, MantenerCambio_, CodigoContableANT_
            )
            VALUES (
              @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @IdDelegacion,
              @CodigoProveedor, @SiglaNacion, @CifDni, @CifEuropeo, @RazonSocial, @Nombre,
              @Domicilio, @CodigoPostal, @CodigoMunicipio, @Municipio, @CodigoProvincia, @Provincia,
              @CodigoNacion, @Nacion, @CodigoCondiciones, @FormadePago,
              @CodigoContable, @ObservacionesPedido, @FechaPedido, @FechaNecesaria, @FechaRecepcion, @FechaTope,
              @StatusAprobado, @BaseImponible, @TotalIva, @ImporteLiquido, @NumeroLineas,
              @CodigoIdioma_, @MantenerCambio_, @CodigoContableANT_
            )
          `);

        // Insertar líneas del pedido a proveedor
        let baseImponibleProveedor = 0;
        let totalIVAProveedor = 0;

        for (const [index, item] of itemsProveedor.entries()) {
          const importeLinea = item.UnidadesPedidas * (item.Precio || 0);
          const ivaLinea = importeLinea * (item.PorcentajeIva || 21) / 100;
          
          baseImponibleProveedor += importeLinea;
          totalIVAProveedor += ivaLinea;

          await transaction.request()
            .input('CodigoEmpresa', CodigoEmpresa)
            .input('EjercicioPedido', EjercicioPedido)
            .input('SeriePedido', 'WebCD')
            .input('NumeroPedido', numeroPedidoProveedor)
            .input('Orden', index + 1)
            .input('CodigoArticulo', item.CodigoArticulo)
            .input('DescripcionArticulo', item.DescripcionArticulo)
            .input('UnidadesPedidas', item.UnidadesPedidas)
            .input('Precio', item.Precio || 0)
            .input('CodigoIva', item.CodigoIva || 21)
            .input('PorcentajeIva', item.PorcentajeIva || 21)
            .input('ImporteBruto', importeLinea)
            .input('BaseImponible', importeLinea)
            .input('CuotaIva', ivaLinea)
            .input('ImporteLiquido', importeLinea + ivaLinea)
            .query(`
              INSERT INTO LineasPedidoProveedor (
                CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
                CodigoArticulo, DescripcionArticulo,
                UnidadesPedidas, Precio,
                CodigoIva, [%Iva],
                ImporteBruto, BaseImponible, CuotaIva, ImporteLiquido
              )
              VALUES (
                @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @Orden,
                @CodigoArticulo, @DescripcionArticulo,
                @UnidadesPedidas, @Precio,
                @CodigoIva, @PorcentajeIva,
                @ImporteBruto, @BaseImponible, @CuotaIva, @ImporteLiquido
              )
            `);
        }

        // Actualizar totales del pedido a proveedor
        await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'WebCD')
          .input('NumeroPedido', numeroPedidoProveedor)
          .input('BaseImponible', baseImponibleProveedor)
          .input('TotalIVA', totalIVAProveedor)
          .input('ImporteLiquido', baseImponibleProveedor + totalIVAProveedor)
          .query(`
            UPDATE CabeceraPedidoProveedor 
            SET 
              BaseImponible = @BaseImponible,
              TotalIva = @TotalIVA,
              ImporteLiquido = @ImporteLiquido
            WHERE 
              CodigoEmpresa = @CodigoEmpresa AND
              EjercicioPedido = @EjercicioPedido AND
              SeriePedido = @SeriePedido AND
              NumeroPedido = @NumeroPedido
          `);

        // 7. Generar albarán para el proveedor
        const numeroAlbaranProveedor = await generarAlbaranProveedor(
          transaction, 
          orderHeader, 
          proveedor, 
          itemsProveedor, 
          numeroPedidoProveedor
        );
        console.log(`Albarán de proveedor ${codigoProveedor} generado: ${numeroAlbaranProveedor}`);

        numeroPedidoProveedor++;
      }

      // Actualizar el contador de pedidos a proveedor
      await transaction.request()
        .input('sysGrupo', CodigoEmpresa)
        .input('sysNombreContador', 'PEDIDOS_PRO')
        .input('sysNumeroSerie', 'WebCD')
        .input('sysContadorValor', numeroPedidoProveedor - 1)
        .query(`
          UPDATE LSYSCONTADORES 
          SET sysContadorValor = @sysContadorValor
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = @sysNombreContador
          AND (sysNumeroSerie = @sysNumeroSerie OR sysNumeroSerie IS NULL)
        `);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: 'Pedido actualizado, aprobado y convertido a pedidos de proveedor correctamente. Albaranes generados automáticamente.'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción:', err);
      
      let errorMessage = 'Error al procesar la transacción';
      if (err.number === 132) {
        errorMessage = 'Error de duplicación en la base de datos';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la actualización del pedido'
    });
  }
};

module.exports = {
  getPendingOrders,
  getOrderForReview,
  updateOrderQuantitiesAndApprove
};