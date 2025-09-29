// controllers/allOrdersController.js
const { getPool } = require('../db/Sage200db');

const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      cliente,
      estado,
      fechaDesde,
      fechaHasta,
      numeroPedido,
      importeMin,
      importeMax,
      ordenarPor = 'FechaPedido',
      orden = 'DESC'
    } = req.query;

    console.log('Parámetros recibidos en getAllOrders:', req.query);

    const pool = await getPool();
    
    // Filtros base: EjercicioPedido = 2025 y SeriePedido = 'WebCD'
    let whereConditions = ["EjercicioPedido = '2025'", "SeriePedido = 'WebCD'"];
    let inputParams = {};
    
    if (cliente && cliente.trim() !== '') {
      whereConditions.push('RazonSocial LIKE @cliente');
      inputParams.cliente = `%${cliente}%`;
    }
    
    if (estado !== undefined && estado !== '' && !isNaN(parseInt(estado))) {
      whereConditions.push('StatusAprobado = @estado');
      inputParams.estado = parseInt(estado);
    }
    
    if (fechaDesde) {
      whereConditions.push('CONVERT(DATE, FechaPedido) >= @fechaDesde');
      inputParams.fechaDesde = fechaDesde;
    }
    
    if (fechaHasta) {
      whereConditions.push('CONVERT(DATE, FechaPedido) <= @fechaHasta');
      inputParams.fechaHasta = fechaHasta;
    }

    // Nuevos filtros del frontend
    if (numeroPedido && numeroPedido.trim() !== '' && !isNaN(parseInt(numeroPedido))) {
      whereConditions.push('NumeroPedido = @numeroPedido');
      inputParams.numeroPedido = parseInt(numeroPedido);
    }

    if (importeMin && !isNaN(parseFloat(importeMin))) {
      whereConditions.push('BaseImponible >= @importeMin');
      inputParams.importeMin = parseFloat(importeMin);
    }

    if (importeMax && !isNaN(parseFloat(importeMax))) {
      whereConditions.push('BaseImponible <= @importeMax');
      inputParams.importeMax = parseFloat(importeMax);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validar parámetros de ordenación
    const columnasPermitidas = ['NumeroPedido', 'FechaPedido', 'RazonSocial', 'BaseImponible', 'FechaNecesaria', 'StatusAprobado'];
    const ordenPermitido = ['ASC', 'DESC'];
    
    const ordenarPorValido = columnasPermitidas.includes(ordenarPor) ? ordenarPor : 'FechaPedido';
    const ordenValido = ordenPermitido.includes(orden.toUpperCase()) ? orden.toUpperCase() : 'DESC';
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
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
          Estado,
          BaseImponible,
          TotalIVA,
          ImporteLiquido,
          FechaNecesaria,
          ObservacionesPedido,
          CodigoCliente,
          Domicilio,
          CodigoPostal,
          Municipio,
          Provincia
        FROM CabeceraPedidoCliente
        ${whereClause}
      ) AS Results
      WHERE RowNum > ${offset} AND RowNum <= ${offset + limitNum}
    `;
    
    console.log('Consulta ejecutada:', query);
    console.log('Parámetros:', inputParams);
    
    let request = pool.request();
    Object.keys(inputParams).forEach(key => {
      request = request.input(key, inputParams[key]);
    });
    
    const result = await request.query(query);
    
    // Consulta para el total
    let countQuery = `SELECT COUNT(*) as total FROM CabeceraPedidoCliente ${whereClause}`;
    let countRequest = pool.request();
    Object.keys(inputParams).forEach(key => {
      countRequest = countRequest.input(key, inputParams[key]);
    });
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    const totalPaginas = Math.ceil(total / limitNum);

    console.log(`Resultados: ${result.recordset.length} pedidos de ${total} totales`);

    res.status(200).json({
      success: true,
      orders: result.recordset,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: totalPaginas
      }
    });
  } catch (error) {
    console.error('Error al obtener todos los pedidos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener los pedidos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener detalles completos de un pedido específico
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Validar que orderId sea un número y no sea "all"
    if (!orderId || orderId === 'all' || isNaN(parseInt(orderId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de pedido inválido' 
      });
    }

    const pool = await getPool();

    console.log('Buscando detalles del pedido:', orderId);

    // Cabecera del pedido
    const orderResult = await pool.request()
      .input('NumeroPedido', parseInt(orderId))
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT 
          c.*,
          CASE 
            WHEN c.StatusAprobado = 0 THEN 'Pendiente'
            WHEN c.StatusAprobado = -1 AND c.Estado = 0 THEN 'Preparando'
            WHEN c.StatusAprobado = -1 AND c.Estado = 1 THEN 'Parcial'
            WHEN c.StatusAprobado = -1 AND c.Estado = 2 THEN 'Servido'
            ELSE 'Desconocido'
          END as EstadoDescripcion
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

    // Líneas del pedido
    const linesResult = await pool.request()
      .input('NumeroPedido', parseInt(orderId))
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT 
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.Precio,
          l.CodigoProveedor,
          l.ComentarioRecepcion,
          l.FechaRecepcion,
          p.RazonSocial as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
        WHERE l.NumeroPedido = @NumeroPedido
        AND l.SeriePedido = @SeriePedido
        ORDER BY l.Orden
      `);

    console.log(`Encontradas ${linesResult.recordset.length} líneas para el pedido ${orderId}`);

    res.status(200).json({
      success: true,
      order: {
        ...orderResult.recordset[0],
        productos: linesResult.recordset
      }
    });
  } catch (error) {
    console.error('Error al obtener detalle del pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el detalle del pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderDetails
};