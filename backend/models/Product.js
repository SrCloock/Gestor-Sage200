const pool = require('../config/sage200db');

class Product {
  // Método para obtener todos los productos con filtros de búsqueda
  static async getAll(filters = {}) {
    let query = `
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
      ORDER BY ap.CodigoEmpresa, ap.CodigoArticulo, ap.CodigoProveedor;
    `;

    const filterConditions = [];

    // Filtro por proveedor (Razon Social)
    if (filters.proveedor) {
      filterConditions.push(`p.RazonSocial LIKE '%${filters.proveedor}%'`);
    }

    // Filtro por nombre de artículo
    if (filters.nombreArticulo) {
      filterConditions.push(`ap.NombreArticulo LIKE '%${filters.nombreArticulo}%'`);
    }

    // Si hay filtros, los añadimos a la consulta
    if (filterConditions.length > 0) {
      query += ' WHERE ' + filterConditions.join(' AND ');
    }

    // Orden de A-Z o Z-A
    if (filters.orden) {
      query += ` ORDER BY ${filters.orden === 'A-Z' ? 'ap.NombreArticulo ASC' : 'ap.NombreArticulo DESC'}`;
    } else {
      query += ' ORDER BY ap.NombreArticulo ASC';
    }

    // Ejecución de la consulta con los filtros aplicados
    const result = await pool.request().query(query);
    return result.recordset;
  }
}

module.exports = Product;
