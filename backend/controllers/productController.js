const { pool } = require('../config/sage200db');

exports.getProducts = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Obtener productos
    const productsResult = await pool.request()
      .query(`
        SELECT 
          CodigoArticulo AS id,
          NombreArticulo AS name,
          PrecioProveedor AS price
        FROM ArticuloProveedor
        ORDER BY NombreArticulo
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `);

    // Obtener conteo total
    const countResult = await pool.request()
      .query('SELECT COUNT(*) AS total FROM ArticuloProveedor');

    res.json({
      products: productsResult.recordset,
      total: countResult.recordset[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};