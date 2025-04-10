const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');

exports.getProducts = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        AP.CodigoArticulo AS id,
        AP.NombreArticulo AS name,
        AP.PrecioProveedor AS price,
        P.RazonSocial AS supplier
      FROM ArticuloProveedor AP
      LEFT JOIN Proveedores P ON AP.CodigoProveedor = P.CodigoProveedor
      ORDER BY AP.CodigoEmpresa, AP.CodigoArticulo, AP.CodigoProveedor
    `;

    const result = await pool.request().query(query);
    res.status(200).json({
      status: 'success',
      data: result.recordset
    });
  } catch (error) {
    next(new AppError('Error al obtener productos', 500));
  }
};