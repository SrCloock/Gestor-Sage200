const { sage200Pool } = require('../config/sage200db');

exports.getProducts = async (req, res) => {
  try {
    console.log('🔍 Ejecutando consulta a Sage200...');
    
    // Asegurar conexión
    await sage200Pool.connect();

    const query = `
      SELECT TOP 100
        a.Codigo AS CodigoArticulo,
        a.Descripcion AS NombreArticulo,
        a.PrecioVenta AS Precio,
        p.Codigo AS CodigoProveedor,
        p.Nombre AS NombreProveedor,
        CONVERT(VARCHAR, a.UltimaActualizacion, 120) AS UltimaActualizacion
      FROM Articulos a
      LEFT JOIN ArticuloProveedor ap ON a.Codigo = ap.CodigoArticulo
      LEFT JOIN Proveedores p ON ap.CodigoProveedor = p.Codigo
      WHERE a.Activo = 1
      ORDER BY a.Descripcion
    `;

    const result = await sage200Pool.request().query(query);
    
    console.log(`✅ ${result.recordset.length} productos obtenidos`);
    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset
    });

  } catch (err) {
    console.error('❌ Error crítico en getProducts:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.originalError?.info?.message
    });

    res.status(500).json({
      success: false,
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        sqlError: err.originalError?.info?.message
      } : undefined
    });
  }
};