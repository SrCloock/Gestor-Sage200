// controllers/catalogController.js
const { getPool } = require('../db/Sage200db');

const getCatalogProducts = async (req, res) => {
  try {
    const pool = await getPool();
    
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
      WHERE a.CodigoEmpresa = '9999'
      ORDER BY a.DescripcionArticulo
    `;

    const result = await pool.request().query(query);

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
      total: products.length
    });

  } catch (error) {
    console.error('Error al obtener productos del catálogo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cargar el catálogo de productos'
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
      message: 'Error al cargar los filtros'
    });
  }
};

module.exports = {
  getCatalogProducts,
  getProductFilters
};