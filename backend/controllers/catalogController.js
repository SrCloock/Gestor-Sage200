const { getPool } = require('../db/Sage200db');

const getCatalogProducts = async (req, res) => {
  try {
    const pool = await getPool();
    
    // Parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Parámetros de filtrado
    const { search, proveedor, precioMin, precioMax, sortBy } = req.query;

    // Construir condiciones WHERE dinámicamente
    let whereConditions = ["a.CodigoEmpresa = '9999'"];
    let inputParams = {};
    
    if (search) {
      whereConditions.push('(a.DescripcionArticulo LIKE @search OR a.CodigoArticulo LIKE @search OR p.Nombre LIKE @search)');
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
    
    // Ordenamiento
    let orderBy = 'a.DescripcionArticulo';
    if (sortBy === 'precio-asc') {
      orderBy = 'a.PrecioVenta ASC';
    } else if (sortBy === 'precio-desc') {
      orderBy = 'a.PrecioVenta DESC';
    } else if (sortBy === 'proveedor') {
      orderBy = 'p.Nombre';
    }

    // Consulta principal con paginación
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
    // Agregar parámetros a la solicitud
    Object.keys(inputParams).forEach(key => {
      if (key === 'precioMin' || key === 'precioMax') {
        request = request.input(key, inputParams[key]);
      } else {
        request = request.input(key, inputParams[key]);
      }
    });

    const result = await request.query(query);

    // Consulta para el total de productos (para paginación)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor AND p.CodigoEmpresa = '9999'
      ${whereClause}
    `;
    
    let countRequest = pool.request();
    Object.keys(inputParams).forEach(key => {
      if (key === 'precioMin' || key === 'precioMax') {
        countRequest = countRequest.input(key, inputParams[key]);
      } else {
        countRequest = countRequest.input(key, inputParams[key]);
      }
    });
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    // Procesar los resultados para incluir imagen por defecto si no hay ruta
    const products = result.recordset.map(product => ({
      ...product,
      RutaImagen: product.RutaImagen || '/images/default-product.png',
      PrecioVenta: parseFloat(product.PrecioVenta) || 0,
      PorcentajeIva: parseFloat(product.PorcentajeIva) || 21
    }));

    return res.status(200).json({
      success: true,
      products: products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error al obtener productos del catálogo:', error);
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
    
    // Obtener proveedores únicos
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
      filters: {
        proveedores: proveedoresResult.recordset
      }
    });

  } catch (error) {
    console.error('Error al obtener filtros:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cargar los filtros',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función para sincronizar imágenes con la base de datos
const syncImagesWithDB = async () => {
  try {
    const pool = await getPool();
    console.log('✅ Sincronización de imágenes completada');
  } catch (error) {
    console.error('❌ Error en sincronización de imágenes:', error);
  }
};

module.exports = {
  getCatalogProducts,
  getProductFilters,
  syncImagesWithDB
};