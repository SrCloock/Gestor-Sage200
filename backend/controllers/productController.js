const { sage200Pool } = require('../config');

exports.getProducts = async (req, res) => {
  try {
    console.log('Ejecutando consulta corregida a Sage200...');
    
    const query = `
      SELECT 
        ap.CodigoEmpresa,
        ap.CodigoArticulo,
        ap.CodigoProveedor,
        a.Descripcion AS NombreArticulo,  /* Cambiado de Nombre a Descripcion */
        p.Nombre AS NombreProveedor,
        a.PrecioVenta AS Precio         /* Cambiado de Precio a PrecioVenta */
      FROM ArticuloProveedor ap
      JOIN Articulos a ON ap.CodigoArticulo = a.Codigo
      JOIN Proveedores p ON ap.CodigoProveedor = p.Codigo
      ORDER BY ap.CodigoEmpresa, ap.CodigoArticulo, ap.CodigoProveedor
    `;
    
    const result = await sage200Pool.request().query(query);
    console.log('Productos obtenidos:', result.recordset.length);
    
    res.json(result.recordset);
    
  } catch (err) {
    console.error('Error en getProducts:', err);
    res.status(500).json({ 
      error: 'Error al obtener productos',
      details: err.message,
      suggestion: 'Verifique los nombres de columna en la base de datos'
    });
  }
};