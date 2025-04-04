const { pool } = require('../config/sage200db');
const { cache } = require('../services/cacheService');
const AppError = require('../utils/AppError');

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

    // Consulta SQL corregida
    const query = `
      SELECT 
        a.Codigo AS id, 
        a.Nombre AS name, 
        a.Precio AS price,
        p.Nombre AS supplier
      FROM Articulos a
      JOIN Proveedores p ON a.CodigoProveedor = p.Codigo;
    `;

    const result = await pool.request().query(query);

    if (!result.recordset || result.recordset.length === 0) {
      return next(new AppError('No se encontraron productos', 404));
    }

    // Intentar almacenar en caché
    try {
      cache.set(CACHE_KEY, result.recordset, 3600);
    } catch (cacheError) {
      console.error('Error al almacenar en caché:', cacheError);
    }

    res.json({
      success: true,
      fromCache: false,
      data: result.recordset,
      count: result.recordset.length,
    });

  } catch (err) {
    console.error('Error en getProducts:', err);
    next(new AppError('Error al obtener productos', 500));
  }
};
