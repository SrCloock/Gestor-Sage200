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
    
    // CONSULTA CORREGIDA: Usando ROW_NUMBER() para paginación compatible
    let query = `
      SELECT * FROM (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY ${ordenarPorValido} ${ordenValido}) as RowNum,
          NumeroPedido,
          FechaPedido,
          RazonSocial,
          CifDni,
          NumeroLineas,
          StatusAprobado,
          SeriePedido,
          BaseImponible,
          TotalIva,
          ImporteLiquido,
          FechaNecesaria,
          ObservacionesPedido,
          CodigoCliente
        FROM CabeceraPedidoCliente
        ${whereClause}
      ) AS Results
      WHERE RowNum > ${offset} AND RowNum <= ${offset + parseInt(limit)}
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
      pagination: {
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

    // CORREGIDO: Consulta actualizada para usar PrecioVentaconIVA1 de Articulos
    const linesResult = await pool.request()
      .input('NumeroPedido', orderId)
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT DISTINCT
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.Precio,  -- Este es el precio con IVA que se guardó en LineasPedidoCliente
          l.CodigoProveedor,
          l.CodigoIva,
          l.[%Iva] as PorcentajeIva,
          a.PrecioVentaconIVA1,  -- NUEVO: Precio correcto con IVA desde Articulos
          COALESCE(p.RazonSocial, 'No especificado') as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Articulos a ON l.CodigoArticulo = a.CodigoArticulo  -- NUEVO: JOIN con Articulos
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
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
        
        // CORREGIDO: Usar PrecioVentaconIVA1 si está disponible, sino usar el Precio de la línea
        const precioFinal = item.PrecioVentaconIVA1 || item.Precio;
        
        uniqueProducts.push({
          ...item,
          Precio: precioFinal  // Aseguramos que el precio mostrado sea el correcto
        });
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

// CORREGIDO: Función para generar albarán de cliente con cálculo correcto de precios
const generarAlbaranCliente = async (transaction, orderHeader, items) => {
  const { CodigoEmpresa, EjercicioPedido, CodigoCliente, RazonSocial, Domicilio, Municipio, Provincia, NumeroPedido } = orderHeader;

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

  // CORREGIDO: Calcular totales usando PrecioVentaconIVA1
  let baseImponibleTotal = 0;
  let totalIVATotal = 0;

  items.forEach(item => {
    // Usar PrecioVentaconIVA1 si está disponible, sino usar Precio
    const precioConIva = item.PrecioVentaconIVA1 || item.Precio || 0;
    const unidades = item.UnidadesPedidas || 0;
    const porcentajeIva = item.PorcentajeIva || 21;

    // CORREGIDO: Cálculo correcto - el precio ya incluye IVA, calcular base imponible
    const baseImponible = (precioConIva * unidades) / (1 + (porcentajeIva / 100));
    const ivaLinea = baseImponible * (porcentajeIva / 100);

    baseImponibleTotal += baseImponible;
    totalIVATotal += ivaLinea;
  });

  const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

  // Insertar cabecera del albarán
  await transaction.request()
    .input('CodigoEmpresa', CodigoEmpresa)
    .input('EjercicioAlbaran', EjercicioPedido)
    .input('SerieAlbaran', 'WebCD')
    .input('NumeroAlbaran', numeroAlbaran)
    .input('NumeroPedido', NumeroPedido)
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
        CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, NumeroPedido,
        CodigoCliente, RazonSocial, Domicilio, Municipio, Provincia,
        FechaAlbaran, NumeroLineas, BaseImponible, TotalIVA, ImporteLiquido,
        StatusFacturado
      ) VALUES (
        @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @NumeroPedido,
        @CodigoCliente, @RazonSocial, @Domicilio, @Municipio, @Provincia,
        @FechaAlbaran, @NumeroLineas, @BaseImponible, @TotalIVA, @ImporteLiquido,
        @StatusFacturado
      )
    `);

  // Insertar líneas del albarán
  for (const [index, item] of items.entries()) {
    // CORREGIDO: Usar PrecioVentaconIVA1 si está disponible
    const precioConIva = item.PrecioVentaconIVA1 || item.Precio || 0;
    const unidades = item.UnidadesPedidas || 0;
    const porcentajeIva = item.PorcentajeIva || 21;

    // CORREGIDO: Cálculo correcto - el precio ya incluye IVA
    const baseImponible = (precioConIva * unidades) / (1 + (porcentajeIva / 100));
    const ivaLinea = baseImponible * (porcentajeIva / 100);
    const importeLiquido = baseImponible + ivaLinea;

    await transaction.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioAlbaran', EjercicioPedido)
      .input('SerieAlbaran', 'WebCD')
      .input('NumeroAlbaran', numeroAlbaran)
      .input('Orden', index + 1)
      .input('CodigoArticulo', item.CodigoArticulo)
      .input('DescripcionArticulo', item.DescripcionArticulo)
      .input('Unidades', unidades)
      .input('UnidadesServidas', 0)
      .input('Precio', precioConIva)  // Precio con IVA
      .input('BaseImponible', baseImponible)
      .input('PorcentajeIva', porcentajeIva)
      .input('CuotaIva', ivaLinea)
      .input('ImporteLiquido', importeLiquido)
      .input('ComentarioRecepcion', '')
      .query(`
        INSERT INTO LineasAlbaranCliente (
          CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, Orden,
          CodigoArticulo, DescripcionArticulo, Unidades, UnidadesServidas, Precio,
          BaseImponible, [%Iva], CuotaIva, ImporteLiquido, ComentarioRecepcion
        ) VALUES (
          @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @Orden,
          @CodigoArticulo, @DescripcionArticulo, @Unidades, @UnidadesServidas, @Precio,
          @BaseImponible, @PorcentajeIva, @CuotaIva, @ImporteLiquido, @ComentarioRecepcion
        )
      `);
  }

  return numeroAlbaran;
};

// CORREGIDO: Función principal de actualización y aprobación
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
            CodigoContable,
            NumeroPedido
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderHeader = orderResult.recordset[0];
      const { CodigoEmpresa, EjercicioPedido, CodigoCliente, CifDni, RazonSocial, Domicilio, CodigoPostal, Municipio, Provincia, IdDelegacion, CodigoContable, NumeroPedido } = orderHeader;

      // Si no hay items, eliminar el pedido completo
      if (!items || items.length === 0) {
        console.log(`Eliminando pedido ${orderId} completo por falta de productos`);
        
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .query(`
            DELETE FROM LineasPedidoCliente
            WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
          `);

        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .query(`
            DELETE FROM CabeceraPedidoCliente
            WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
          `);

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: 'Pedido eliminado correctamente porque no contenía productos'
        });
      }

      // 2. Obtener órdenes actuales para identificar líneas eliminadas
      const currentLinesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT Orden 
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      const currentOrders = currentLinesResult.recordset.map(row => row.Orden);
      const updatedOrders = items.map(item => item.Orden);

      // 3. Eliminar líneas que ya no están en el array de items
      const ordersToDelete = currentOrders.filter(order => !updatedOrders.includes(order));
      
      for (const orderToDelete of ordersToDelete) {
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .input('Orden', orderToDelete)
          .query(`
            DELETE FROM LineasPedidoCliente
            WHERE NumeroPedido = @NumeroPedido 
            AND SeriePedido = @SeriePedido 
            AND Orden = @Orden
          `);
      }

      // 4. Actualizar cantidades en LineasPedidoCliente para las líneas existentes
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

      // 5. CORREGIDO: Recalcular totales del pedido usando BaseImponible y TotalIva directamente
      const totalesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            SUM(BaseImponible) AS BaseImponible,
            SUM(TotalIva) AS TotalIVA
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido
          AND SeriePedido = @SeriePedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

      // 6. Actualizar cabecera con nuevos totales y estado
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

      // 7. Generar albarán para el cliente
      const numeroAlbaranCliente = await generarAlbaranCliente(transaction, orderHeader, items);
      console.log(`Albarán de cliente generado: ${numeroAlbaranCliente}`);

      // 8. Crear pedidos a proveedores (agrupados por proveedor)
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
          // CORREGIDO: Usar PrecioVentaconIVA1 si está disponible
          const precioConIva = item.PrecioVentaconIVA1 || item.Precio || 0;
          const unidades = item.UnidadesPedidas || 0;
          const porcentajeIva = item.PorcentajeIva || 21;

          // CORREGIDO: Cálculo correcto - el precio ya incluye IVA
          const baseImponible = (precioConIva * unidades) / (1 + (porcentajeIva / 100));
          const ivaLinea = baseImponible * (porcentajeIva / 100);
          
          baseImponibleProveedor += baseImponible;
          totalIVAProveedor += ivaLinea;

          await transaction.request()
            .input('CodigoEmpresa', CodigoEmpresa)
            .input('EjercicioPedido', EjercicioPedido)
            .input('SeriePedido', 'WebCD')
            .input('NumeroPedido', numeroPedidoProveedor)
            .input('Orden', index + 1)
            .input('CodigoArticulo', item.CodigoArticulo)
            .input('DescripcionArticulo', item.DescripcionArticulo)
            .input('UnidadesPedidas', unidades)
            .input('Precio', precioConIva)  // Precio con IVA
            .input('CodigoIva', item.CodigoIva || porcentajeIva)  // El código de IVA es el porcentaje
            .input('PorcentajeIva', porcentajeIva)
            .input('ImporteBruto', baseImponible + ivaLinea)
            .input('BaseImponible', baseImponible)
            .input('CuotaIva', ivaLinea)
            .input('ImporteLiquido', baseImponible + ivaLinea)
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

        console.log(`Pedido a proveedor ${codigoProveedor} generado: ${numeroPedidoProveedor}`);

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
        message: 'Pedido actualizado, aprobado y convertido a pedidos de proveedor correctamente. Albarán de cliente generado automáticamente.'
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