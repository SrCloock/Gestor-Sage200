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
        data: cache.get(CACHE_KEY)
      });
    }

    const query = `SELECT...`; // Tu query optimizada
    const result = await pool.request().query(query);
    
    // Almacenar en caché (1 hora)
    cache.set(CACHE_KEY, result.recordset, 3600);
    
    res.json({
      success: true,
      fromCache: false,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (err) {
    next(new AppError('Error al obtener productos', 500));
  }
};