const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class Product {
  static async findAll(filters = {}) {
    try {
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
      if (filters.search) {
        query += ` AND a.Nombre LIKE '%' + @search + '%'`;
        params.push({ name: 'search', value: filters.search });
      }

      if (filters.proveedor) {
        query += ` AND p.RazonSocial LIKE '%' + @proveedor + '%'`;
        params.push({ name: 'proveedor', value: filters.proveedor });
      }

      // Ordenación
      const validSortFields = ['NombreArticulo', 'Precio', 'Proveedor'];
      const validSortOrders = ['ASC', 'DESC'];
      
      const sortField = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'NombreArticulo';
      const sortDir = validSortOrders.includes(filters.sortOrder?.toUpperCase()) ? filters.sortOrder : 'ASC';

      query += ` ORDER BY ${sortField} ${sortDir}`;

      const request = pool.request();
      params.forEach(param => {
        request.input(param.name, param.value);
      });

      const result = await request.query(query);

      return result.recordset;
    } catch (error) {
      logger.error('Error en Product.findAll:', error);
      throw error;
    }
  }

  static async findById(codigoArticulo) {
    try {
      const result = await pool.request()
        .input('CodigoArticulo', codigoArticulo)
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
        return null;
      }

      return result.recordset[0];
    } catch (error) {
      logger.error('Error en Product.findById:', error);
      throw error;
    }
  }

  static async getProveedores() {
    try {
      const result = await pool.request()
        .query(`
          SELECT CodigoProveedor, RazonSocial
          FROM Proveedores
          ORDER BY RazonSocial
        `);

      return result.recordset;
    } catch (error) {
      logger.error('Error en Product.getProveedores:', error);
      throw error;
    }
  }
}

module.exports = Product;