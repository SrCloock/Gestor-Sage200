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
      ordenarPor = 'FechaPedido',
      orden = 'DESC'
    } = req.query;

    const pool = await getPool();
    
    let whereConditions = ["SeriePedido = 'WebCD'"];
    let inputParams = {};
    
    if (cliente) {
      whereConditions.push('RazonSocial LIKE @cliente');
      inputParams.cliente = `%${cliente}%`;
    }
    
    if (estado !== undefined && estado !== '') {
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
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validar parámetros de ordenación
    const columnasPermitidas = ['NumeroPedido', 'FechaPedido', 'RazonSocial', 'BaseImponible', 'FechaNecesaria', 'StatusAprobado'];
    const ordenPermitido = ['ASC', 'DESC'];
    
    const ordenarPorValido = columnasPermitidas.includes(ordenarPor) ? ordenarPor : 'FechaPedido';
    const ordenValido = ordenPermitido.includes(orden.toUpperCase()) ? orden.toUpperCase() : 'DESC';
    
    const offset = (page - 1) * limit;
    
    // Consulta principal con todos los pedidos
    let query = `
      SELECT 
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
      ORDER BY ${ordenarPorValido} ${ordenValido}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    
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
    const totalPaginas = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      orders: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
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
    const pool = await getPool();

    // Cabecera del pedido
    const orderResult = await pool.request()
      .input('NumeroPedido', orderId)
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
      .input('NumeroPedido', orderId)
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