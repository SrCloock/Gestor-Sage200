const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');
const cache = require('memory-cache'); // Asegúrate de tener la dependencia 'memory-cache' instalada

const CACHE_KEY = 'products';

exports.getProducts = async (req, res, next) => {
  try {
    // Verificar caché
    if (cache.has(CACHE_KEY)) {
      return res.json({
        success: true,
        fromCache: true,
        data: cache.get(CACHE_KEY),
      });
    }

    // Desestructurar parámetros de la solicitud para filtrado
    const { filterBy, searchTerm, order } = req.query; // Añadir filtros

    // Generar cláusula WHERE según los filtros
    let whereClause = '';
    if (searchTerm) {
      if (filterBy === 'supplier') {
        whereClause += `AND p.RazonSocial LIKE '%${searchTerm}%' `;
      } else if (filterBy === 'name') {
        whereClause += `AND ap.NombreArticulo LIKE '%${searchTerm}%' `;
      }
    }

    // Definir el orden (A-Z o Z-A)
    let orderBy = 'ap.CodigoArticulo'; // Por defecto, por código de artículo
    if (order === 'desc') {
      orderBy = 'ap.CodigoArticulo DESC'; // Z-A
    } else {
      orderBy = 'ap.CodigoArticulo'; // A-Z por defecto
    }

    // Consulta SQL con filtro dinámico
    const query = `
      SELECT 
        ap.CodigoEmpresa,
        ap.CodigoArticulo AS id,
        ap.NombreArticulo AS name,
        ap.PrecioProveedor AS price,
        ap.CodigoProveedor,
        p.RazonSocial AS supplier
      FROM ArticuloProveedor ap
      INNER JOIN Proveedores p 
        ON ap.CodigoProveedor = p.CodigoProveedor 
        AND ap.CodigoEmpresa = p.CodigoEmpresa
      WHERE 1 = 1 ${whereClause}  -- Condición para agregar dinámicamente filtros
      ORDER BY ${orderBy};
    `;

    const result = await pool.request().query(query);

    if (!result.recordset || result.recordset.length === 0) {
      return next(new AppError('No products found', 404));
    }

    // Cachear el resultado
    cache.put(CACHE_KEY, result.recordset, 3600000); // Cache por 1 hora

    // Retornar resultado
    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.getProductById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const query = `SELECT * FROM Productos WHERE id = @id`;

    const result = await pool.request().input('id', sql.Int, id).query(query);

    if (!result.recordset.length) {
      return next(new AppError('Product not found', 404));
    }

    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};
