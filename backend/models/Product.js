// Archivo: Product.js
const pool = require('../config/sage200db');

class Product {
  static async getAll() {
    const result = await pool.request().query(`
      SELECT 
        a.Codigo, a.Nombre, a.Precio, 
        p.Nombre AS Proveedor 
      FROM Articulos a
      JOIN Proveedores p ON a.CodigoProveedor = p.Codigo
    `);
    return result.recordset;
  }
}

module.exports = Product;