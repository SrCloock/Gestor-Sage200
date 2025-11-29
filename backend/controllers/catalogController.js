const { getPool } = require('../db/Sage200db');

const getCatalogProducts = async (req, res) => {
  try {
    const pool = await getPool();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { search, proveedor, precioMin, precioMax, sortBy } = req.query;

    let whereConditions = ["a.CodigoEmpresa = '9999'"];
    let inputParams = {};

    if (search) {
      whereConditions.push(
        '(a.DescripcionArticulo LIKE @search OR a.CodigoArticulo LIKE @search OR p.Nombre LIKE @search)'
      );
      inputParams.search = `%${search}%`;
    }

    if (proveedor) {
      whereConditions.push('a.CodigoProveedor = @proveedor');
      inputParams.proveedor = proveedor;
    }

    if (precioMin) {
      whereConditions.push('a.PrecioVenta >= @precioMin');
      inputParams.precioMin = parseFloat(precioMin);
    }

    if (precioMax) {
      whereConditions.push('a.PrecioVenta <= @precioMax');
      inputParams.precioMax = parseFloat(precioMax);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'a.DescripcionArticulo';
    if (sortBy === 'precio-asc') orderBy = 'a.PrecioVenta ASC';
    else if (sortBy === 'precio-desc') orderBy = 'a.PrecioVenta DESC';
    else if (sortBy === 'proveedor') orderBy = 'p.Nombre';

    const query = `
      SELECT 
        a.CodigoArticulo,
        a.DescripcionArticulo,
        a.CodigoProveedor,
        p.Nombre as NombreProveedor,
        a.PrecioVenta,
        a.GrupoIva,
        a.RutaImagen,
        gi.CodigoIvasinRecargo as PorcentajeIva
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor AND p.CodigoEmpresa = '9999'
      LEFT JOIN (
        SELECT GrupoIva, MAX(FechaInicio) as MaxFecha
        FROM GrupoIva 
        GROUP BY GrupoIva
      ) gi_max ON a.GrupoIva = gi_max.GrupoIva
      LEFT JOIN GrupoIva gi ON gi_max.GrupoIva = gi.GrupoIva AND gi_max.MaxFecha = gi.FechaInicio
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    let request = pool.request();
    Object.keys(inputParams).forEach(key => {
      request = request.input(key, inputParams[key]);
    });

    const result = await request.query(query);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor AND p.CodigoEmpresa = '9999'
      ${whereClause}
    `;

    let countRequest = pool.request();
    Object.keys(inputParams).forEach(key => {
      countRequest = countRequest.input(key, inputParams[key]);
    });

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    const products = result.recordset.map(product => ({
      ...product,
      RutaImagen: product.RutaImagen || '/images/default-product.png',
      PrecioVenta: parseFloat(product.PrecioVenta) || 0,
      PorcentajeIva: parseFloat(product.PorcentajeIva) || 21
    }));

    return res.status(200).json({
      success: true,
      products,
      pagination: { page, limit, total, totalPages }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al cargar el catálogo de productos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProductFilters = async (req, res) => {
  try {
    const pool = await getPool();

    const proveedoresQuery = `
      SELECT DISTINCT p.CodigoProveedor, p.Nombre as NombreProveedor
      FROM Proveedores p
      INNER JOIN Articulos a ON p.CodigoProveedor = a.CodigoProveedor
      WHERE p.CodigoEmpresa = '9999'  
      ORDER BY p.Nombre
    `;

    const proveedoresResult = await pool.request().query(proveedoresQuery);

    return res.status(200).json({
      success: true,
      filters: { proveedores: proveedoresResult.recordset }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al cargar los filtros',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const syncImagesWithDB = async () => {
  try {
    const pool = await getPool();
  } catch (error) {
  }
};

module.exports = {
  getCatalogProducts,
  getProductFilters,
  syncImagesWithDB
};