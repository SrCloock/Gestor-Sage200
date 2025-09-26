const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/Sage200db');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const IMAGE_FOLDER = path.join(__dirname, '../public/images');

const fileExists = (filePath) => {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
};

const getProductImage = async (codigoArticulo) => {
  for (const ext of IMAGE_EXTENSIONS) {
    const filePath = path.join(IMAGE_FOLDER, `${codigoArticulo}${ext}`);
    if (await fileExists(filePath)) {
      return `${codigoArticulo}${ext}`;
    }
  }
  return null;
};

const getProducts = async (req, res) => {
  try {
    const pool = await getPool();
    
    const { page = 1, limit = 1000, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        a.CodigoArticulo, 
        a.DescripcionArticulo, 
        a.CodigoProveedor, 
        a.PrecioCompra, 
        a.PrecioVenta,
        a.RutaImagen,
        a.Familia,
        a.Subfamilia,
        p.RazonSocial AS NombreProveedor
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
      WHERE a.CodigoArticulo IS NOT NULL 
        AND a.DescripcionArticulo IS NOT NULL
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM Articulos a
      WHERE a.CodigoArticulo IS NOT NULL 
        AND a.DescripcionArticulo IS NOT NULL
    `;

    if (search.trim()) {
      const searchCondition = `
        AND (a.DescripcionArticulo LIKE '%${search}%' 
             OR a.CodigoArticulo LIKE '%${search}%'
             OR p.RazonSocial LIKE '%${search}%')
      `;
      query += searchCondition;
      countQuery += searchCondition;
    }

    query += ` ORDER BY a.DescripcionArticulo OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    const result = await pool.request().query(query);
    const countResult = await pool.request().query(countQuery);

    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const updatedProducts = await Promise.all(
      result.recordset.map(async (product) => {
        const imageName = await getProductImage(product.CodigoArticulo);
        return {
          ...product,
          RutaImagen: imageName ? `${serverUrl}/images/${imageName}` : `${serverUrl}/images/default.jpg`,
          DescripcionCompleta: product.DescripcionArticulo
        };
      })
    );

    res.status(200).json({
      success: true,
      products: updatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.recordset[0].total / limit),
        total: countResult.recordset[0].total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener productos' 
    });
  }
};