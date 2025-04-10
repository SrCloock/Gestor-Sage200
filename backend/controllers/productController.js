const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');

const CACHE_KEY = 'products';
const CACHE_TTL = 3600; // 1 hora

exports.getProducts = async (req, res, next) => {
  try {
    // Verificar caché
    if (cache.has(CACHE_KEY)) {
      return res.json({
        success: true,
        fromCache: true,
        data: cache.get(CACHE_KEY),
      });
    }

    const query = `
      SELECT 
        ap.CodigoEmpresa,
        ap.CodigoArticulo AS id,
        ap.NombreArticulo AS name,
        ap.PrecioProveedor AS price,
        ap.CodigoProveedor AS supplierId,
        p.RazonSocial AS supplier
      FROM ArticuloProveedor ap
      INNER JOIN Proveedores p 
        ON ap.CodigoProveedor = p.CodigoProveedor 
        AND ap.CodigoEmpresa = p.CodigoEmpresa
      ORDER BY ap.NombreArticulo ASC
    `;

    const result = await pool.request().query(query);

    if (!result.recordset || result.recordset.length === 0) {
      return next(new AppError('No se encontraron productos en el catálogo', 404));
    }

    // Guardar en caché
    cache.set(CACHE_KEY, result.recordset, CACHE_TTL);

    res.json({
      success: true,
      fromCache: false,
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (err) {
    next(new AppError('Error al obtener productos', 500));
  }
};

exports.getFilteredProducts = async (req, res, next) => {
  try {
    const { nombre, proveedor, orden } = req.query;
    let query = `
      SELECT 
        ap.CodigoArticulo AS id,
        ap.NombreArticulo AS name,
        ap.PrecioProveedor AS price,
        p.RazonSocial AS supplier,
        p.CodigoProveedor AS supplierId
      FROM ArticuloProveedor ap
      INNER JOIN Proveedores p 
        ON ap.CodigoProveedor = p.CodigoProveedor
      WHERE 1=1
    `;

    const request = pool.request();

    if (nombre) {
      query += ' AND ap.NombreArticulo LIKE @nombre';
      request.input('nombre', `%${nombre}%`);
    }

    if (proveedor) {
      query += ' AND p.RazonSocial LIKE @proveedor';
      request.input('proveedor', `%${proveedor}%`);
    }

    query += orden === 'desc' 
      ? ' ORDER BY ap.NombreArticulo DESC' 
      : ' ORDER BY ap.NombreArticulo ASC';

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (error) {
    next(new AppError('Error al filtrar productos', 500));
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT 
          ap.CodigoArticulo AS id,
          ap.NombreArticulo AS name,
          ap.PrecioProveedor AS price,
          ap.Descripcion AS description,
          p.RazonSocial AS supplier,
          p.CodigoProveedor AS supplierId
        FROM ArticuloProveedor ap
        INNER JOIN Proveedores p 
          ON ap.CodigoProveedor = p.CodigoProveedor
        WHERE ap.CodigoArticulo = @id
      `);

    if (result.recordset.length === 0) {
      return next(new AppError('Producto no encontrado', 404));
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    next(new AppError('Error al obtener el producto', 500));
  }
};