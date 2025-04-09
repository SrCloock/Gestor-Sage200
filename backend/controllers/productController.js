const AppError = require('../utils/AppError');
const { pool } = require('../config/sage200db');
const logger = require('../utils/logger');

exports.getProducts = async (req, res, next) => {
  try {
    const { search, proveedor, sortBy, sortOrder } = req.query;
    
    let query = `
      SELECT 
        ap.CodigoArticulo, a.Nombre AS NombreArticulo,
        ap.PrecioProveedor AS Precio, p.RazonSocial AS Proveedor,
        p.CodigoProveedor
      FROM ArticuloProveedor ap
      INNER JOIN Articulos a ON ap.CodigoArticulo = a.Codigo
      INNER JOIN Proveedores p ON ap.CodigoProveedor = p.CodigoProveedor
      WHERE 1=1
    `;

    const params = [];

    // Filtros
    if (search) {
      query += ` AND a.Nombre LIKE '%' + @search + '%'`;
      params.push({ name: 'search', value: search });
    }

    if (proveedor) {
      query += ` AND p.RazonSocial LIKE '%' + @proveedor + '%'`;
      params.push({ name: 'proveedor', value: proveedor });
    }

    // Ordenación
    const validSortFields = ['NombreArticulo', 'Precio', 'Proveedor'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'NombreArticulo';
    const sortDir = validSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder : 'ASC';

    query += ` ORDER BY ${sortField} ${sortDir}`;

    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.value);
    });

    const result = await request.query(query);

    res.status(200).json({
      status: 'success',
      results: result.recordset.length,
      data: result.recordset
    });

  } catch (error) {
    logger.error('Error al obtener productos:', error);
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.request()
      .input('CodigoArticulo', id)
      .query(`
        SELECT 
          a.Codigo, a.Nombre, a.Descripcion,
          ap.PrecioProveedor AS Precio, p.RazonSocial AS Proveedor
        FROM Articulos a
        INNER JOIN ArticuloProveedor ap ON a.Codigo = ap.CodigoArticulo
        INNER JOIN Proveedores p ON ap.CodigoProveedor = p.CodigoProveedor
        WHERE a.Codigo = @CodigoArticulo
      `);

    if (result.recordset.length === 0) {
      throw new AppError('Producto no encontrado', 404);
    }

    res.status(200).json({
      status: 'success',
      data: result.recordset[0]
    });
  } catch (error) {
    next(error);
  }
};

exports.getProveedores = async (req, res, next) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT CodigoProveedor, RazonSocial
        FROM Proveedores
        ORDER BY RazonSocial
      `);

    res.status(200).json({
      status: 'success',
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};