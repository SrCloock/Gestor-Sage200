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

    const pool = await getPool();
    
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

    if (numeroPedido && numeroPedido.trim() !== '' && !isNaN(parseInt(numeroPedido))) {
      whereConditions.push('NumeroPedido = @numeroPedido');
      inputParams.numeroPedido = parseInt(numeroPedido);
    }

    if (importeMin && !isNaN(parseFloat(importeMin))) {
      whereConditions.push('ImporteLiquido >= @importeMin');
      inputParams.importeMin = parseFloat(importeMin);
    }

    if (importeMax && !isNaN(parseFloat(importeMax))) {
      whereConditions.push('ImporteLiquido <= @importeMax');
      inputParams.importeMax = parseFloat(importeMax);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const columnasPermitidas = ['NumeroPedido', 'FechaPedido', 'RazonSocial', 'BaseImponible', 'ImporteLiquido', 'FechaNecesaria', 'StatusAprobado'];
    const ordenPermitido = ['ASC', 'DESC'];
    
    const ordenarPorValido = columnasPermitidas.includes(ordenarPor) ? ordenarPor : 'FechaPedido';
    const ordenValido = ordenPermitido.includes(orden.toUpperCase()) ? orden.toUpperCase() : 'DESC';
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
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
          EsParcial,
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
    
    let request = pool.request();
    Object.keys(inputParams).forEach(key => {
      request = request.input(key, inputParams[key]);
    });
    
    const result = await request.query(query);
    
    let countQuery = `SELECT COUNT(*) as total FROM CabeceraPedidoCliente ${whereClause}`;
    let countRequest = pool.request();
    Object.keys(inputParams).forEach(key => {
      countRequest = countRequest.input(key, inputParams[key]);
    });
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    const totalPaginas = Math.ceil(total / limitNum);

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
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener los pedidos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || orderId === 'all' || isNaN(parseInt(orderId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de pedido inválido' 
      });
    }

    const pool = await getPool();

    const orderResult = await pool.request()
      .input('NumeroPedido', parseInt(orderId))
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT 
          c.*,
          CASE 
            WHEN c.StatusAprobado = 0 THEN 'Pendiente'
            WHEN c.StatusAprobado = -1 AND c.Estado = 0 AND c.EsParcial = 0 THEN 'Preparando'
            WHEN c.StatusAprobado = -1 AND c.Estado = 0 AND c.EsParcial = -1 THEN 'Parcial'
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

    const linesResult = await pool.request()
      .input('NumeroPedido', parseInt(orderId))
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT DISTINCT
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.UnidadesPendientes,
          l.Precio,
          l.CodigoProveedor,
          l.ComentarioRecepcion,
          l.FechaRecepcion,
          COALESCE(p.RazonSocial, 'No especificado') as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
        WHERE l.NumeroPedido = @NumeroPedido
        AND l.SeriePedido = @SeriePedido
        ORDER BY l.Orden
      `);

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
        productos: uniqueProducts
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el detalle del pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAdminOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de pedido inválido' 
      });
    }

    const pool = await getPool();

    const orderResult = await pool.request()
      .input('NumeroPedido', parseInt(orderId))
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT 
          c.*,
          CASE 
            WHEN c.StatusAprobado = 0 THEN 'Pendiente'
            WHEN c.StatusAprobado = -1 AND c.Estado = 0 AND c.EsParcial = 0 THEN 'Preparando'
            WHEN c.StatusAprobado = -1 AND c.Estado = 0 AND c.EsParcial = -1 THEN 'Parcial'
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

    const linesResult = await pool.request()
      .input('NumeroPedido', parseInt(orderId))
      .input('SeriePedido', 'WebCD')
      .query(`
        SELECT DISTINCT
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.UnidadesRecibidas,
          l.UnidadesPendientes,
          l.Precio,
          l.CodigoProveedor,
          l.ComentarioRecepcion,
          l.FechaRecepcion,
          COALESCE(p.RazonSocial, 'No especificado') as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
        WHERE l.NumeroPedido = @NumeroPedido
        AND l.SeriePedido = @SeriePedido
        ORDER BY l.Orden
      `);

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
        productos: uniqueProducts
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el detalle del pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderDetails,
  getAdminOrderDetails
};