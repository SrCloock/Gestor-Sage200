const { getPool } = require('../db/Sage200db');

const getProducts = async (req, res) => {
  try {
    const pool = await getPool();
    const { search, page = 1, limit = 1000 } = req.query;
    
    // CORRECCIÓN: Usar los nombres correctos de las columnas
    let query = `
      SELECT 
        a.CodigoArticulo, 
        a.DescripcionArticulo, 
        a.CodigoProveedor, 
        a.PrecioCompra, 
        a.PrecioVenta,
        a.CodigoFamilia as Familia,  -- Corregido: CodigoFamilia como Familia
        a.CodigoSubfamilia as Subfamilia,  -- Corregido: CodigoSubfamilia como Subfamilia
        p.RazonSocial AS NombreProveedor
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
      WHERE a.CodigoArticulo IS NOT NULL 
        AND a.DescripcionArticulo IS NOT NULL
    `;
    
    if (search) {
      query += ` AND (a.DescripcionArticulo LIKE '%${search}%' OR a.CodigoArticulo LIKE '%${search}%' OR p.RazonSocial LIKE '%${search}%')`;
    }
    
    query += ` ORDER BY a.DescripcionArticulo 
               OFFSET ${(page - 1) * limit} ROWS 
               FETCH NEXT ${limit} ROWS ONLY`;
    
    const result = await pool.request().query(query);
    
    res.status(200).json({
      success: true,
      products: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.recordset.length
      }
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener productos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProducts
};