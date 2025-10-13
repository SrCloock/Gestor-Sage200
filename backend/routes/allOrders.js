const express = require('express');
const router = express.Router();
const { getPool } = require('../db/Sage200db');

// Controlador para obtener todos los pedidos (similar a getPendingOrders pero sin filtro de estado)
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
      orden = 'DESC',
      numeroPedido,
      importeMin,
      importeMax
    } = req.query;

    const pool = await getPool();
    
    // Construir condiciones WHERE dinámicamente
    let whereConditions = ["SeriePedido = 'WebCD'"];
    let inputParams = {};
    
    if (numeroPedido) {
      whereConditions.push('NumeroPedido = @numeroPedido');
      inputParams.numeroPedido = numeroPedido;
    }
    
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

    if (importeMin) {
      whereConditions.push('ImporteLiquido >= @importeMin');
      inputParams.importeMin = parseFloat(importeMin);
    }

    if (importeMax) {
      whereConditions.push('ImporteLiquido <= @importeMax');
      inputParams.importeMax = parseFloat(importeMax);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validar parámetros de ordenación
    const columnasPermitidas = ['NumeroPedido', 'FechaPedido', 'RazonSocial', 'CifDni', 'NumeroLineas', 'StatusAprobado', 'BaseImponible', 'ImporteLiquido', 'FechaNecesaria'];
    const ordenPermitido = ['ASC', 'DESC'];
    
    const ordenarPorValido = columnasPermitidas.includes(ordenarPor) ? ordenarPor : 'FechaPedido';
    const ordenValido = ordenPermitido.includes(orden.toUpperCase()) ? orden.toUpperCase() : 'DESC';
    
    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    
    // Consulta con paginación
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
    const totalPages = Math.ceil(total / limit);

    console.log('Todos los pedidos encontrados:', result.recordset.length);

    res.status(200).json({
      success: true,
      orders: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error al obtener todos los pedidos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener todos los pedidos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

router.get('/', getAllOrders);

module.exports = router;