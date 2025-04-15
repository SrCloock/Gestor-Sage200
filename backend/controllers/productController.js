const { getPool } = require('../db/Sage200db');

const getProducts = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT a.CodigoArticulo, a.DescripcionArticulo, a.CodigoProveedor, 
             a.PrecioCompra, p.RazonSocial AS NombreProveedor
      FROM Articulos a
      JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
    `);
    
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

module.exports = { getProducts };