const { sage200Pool, poolConnect } = require('../config/sage200db');

exports.getProducts = async (req, res) => {
  try {
    console.log('Iniciando consulta a Sage200...');
    await poolConnect; // Esperar a que la conexión esté lista

    const query = `
      SELECT 
        ap.CodigoEmpresa,
        ap.CodigoArticulo,
        ap.CodigoProveedor,
        a.Descripcion AS NombreArticulo,
        p.Nombre AS NombreProveedor,
        a.PrecioVenta AS Precio,
        CONVERT(VARCHAR(50), ap.CodigoArticulo) AS id
      FROM ArticuloProveedor ap
      INNER JOIN Articulos a ON ap.CodigoArticulo = a.Codigo
      INNER JOIN Proveedores p ON ap.CodigoProveedor = p.Codigo
      WHERE ap.CodigoEmpresa = '001' -- Filtro por empresa (ajustar según necesidad)
      ORDER BY a.Descripcion
    `;

    const request = sage200Pool.request();
    const result = await request.query(query);

    if (!result.recordset || result.recordset.length === 0) {
      console.warn('⚠️ La consulta no devolvió resultados');
      return res.status(404).json({ message: 'No se encontraron productos' });
    }

    console.log(`✅ ${result.recordset.length} productos obtenidos`);
    res.json(result.recordset);

  } catch (err) {
    console.error('❌ Error en getProducts:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });

    res.status(500).json({
      error: 'Error al obtener productos',
      details: err.message,
      suggestion: 'Verifique: 1) Conexión al servidor, 2) Nombre de tablas, 3) Permisos de usuario'
    });
  }
};