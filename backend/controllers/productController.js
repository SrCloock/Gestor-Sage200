const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/Sage200db');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const IMAGE_FOLDER = path.join(__dirname, '../public/images');

// Cache optimizado
const imageCache = new Map();
const failedImageCache = new Set();
let cacheLoaded = false;

// Pre-cache ultra rápido
const preCacheImages = async () => {
  if (cacheLoaded) return;
  
  try {
    console.log('🔄 Cargando cache de imágenes...');
    const files = await fs.promises.readdir(IMAGE_FOLDER);
    
    let cachedCount = 0;
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const codigo = path.basename(file, ext);
        imageCache.set(codigo, file);
        cachedCount++;
      }
    }
    
    cacheLoaded = true;
    console.log(`✅ Pre-cache de ${cachedCount} imágenes completado`);
  } catch (error) {
    console.error('❌ Error en pre-cache:', error);
  }
};

// Verificación de archivos optimizada
const fileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Función de imagen ultra-rápida
const getProductImage = async (codigoArticulo) => {
  if (!codigoArticulo) return 'default.jpg';

  // Cache hit (más rápido)
  if (imageCache.has(codigoArticulo)) {
    return imageCache.get(codigoArticulo);
  }
  
  if (failedImageCache.has(codigoArticulo)) {
    return 'default.jpg';
  }

  // Búsqueda optimizada en disco
  for (const ext of IMAGE_EXTENSIONS) {
    const fileName = `${codigoArticulo}${ext}`;
    const filePath = path.join(IMAGE_FOLDER, fileName);
    
    if (await fileExists(filePath)) {
      imageCache.set(codigoArticulo, fileName);
      return fileName;
    }
  }

  // Cache de fallos
  failedImageCache.add(codigoArticulo);
  return 'default.jpg';
};

// Controlador principal OPTIMIZADO
const getProducts = async (req, res) => {
  try {
    const startTime = Date.now();
    const { page = 1, limit = 48, search = '', sort = 'DescripcionArticulo', order = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    const pool = await getPool();
    
    // CONSULTA OPTIMIZADA CON PAGINACIÓN
    let query = `
      SELECT 
        a.CodigoArticulo, 
        a.DescripcionArticulo, 
        a.CodigoProveedor, 
        a.PrecioCompra, 
        a.PrecioVenta,
        a.RutaImagen,
        p.RazonSocial AS NombreProveedor
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
      WHERE a.CodigoArticulo IS NOT NULL 
        AND a.DescripcionArticulo IS NOT NULL
        AND a.CodigoArticulo != ''
    `;

    const params = {};
    
    if (search && search.trim() !== '') {
      query += ` AND (
        a.DescripcionArticulo LIKE '%' + @search + '%' OR 
        a.CodigoArticulo LIKE '%' + @search + '%' OR
        p.RazonSocial LIKE '%' + @search + '%'
      )`;
      params.search = search.trim();
    }

    // Ordenación optimizada
    const safeSort = ['CodigoArticulo', 'DescripcionArticulo', 'PrecioVenta', 'NombreProveedor'].includes(sort) 
      ? sort : 'DescripcionArticulo';
    const safeOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${safeSort} ${safeOrder}
               OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    const request = pool.request();
    if (params.search) {
      request.input('search', params.search);
    }
    
    const result = await request.query(query);

    // Contador optimizado
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
      WHERE a.CodigoArticulo IS NOT NULL 
        AND a.DescripcionArticulo IS NOT NULL
        AND a.CodigoArticulo != ''
        ${params.search ? `AND (
          a.DescripcionArticulo LIKE '%' + @search + '%' OR 
          a.CodigoArticulo LIKE '%' + @search + '%' OR
          p.RazonSocial LIKE '%' + @search + '%'
        )` : ''}
    `;

    const countRequest = pool.request();
    if (params.search) {
      countRequest.input('search', params.search);
    }
    const countResult = await countRequest.query(countQuery);

    const total = countResult.recordset[0].total;
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    
    // Procesamiento paralelo de imágenes
    const imageProcessing = result.recordset.map(async (product) => {
      const imageName = await getProductImage(product.CodigoArticulo);
      return {
        ...product,
        RutaImagen: `${serverUrl}/images/${imageName}`,
        // Asegurar precios
        PrecioVenta: product.PrecioVenta || product.PrecioCompra || 0,
        PrecioCompra: product.PrecioCompra || product.PrecioVenta || 0
      };
    });

    const productsWithImages = await Promise.all(imageProcessing);

    const endTime = Date.now();
    console.log(`✅ API Products: ${productsWithImages.length} productos en ${endTime - startTime}ms`);

    res.json({
      success: true,
      products: productsWithImages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNextPage: offset + limit < total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error en getProducts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Sincronización mejorada
const syncImagesWithDB = async () => {
  try {
    const files = await fs.promises.readdir(IMAGE_FOLDER);
    const pool = await getPool();

    const updates = [];
    const batchSize = 100;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchUpdates = batch.map(file => {
        const ext = path.extname(file).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(ext)) return null;
        
        const codigoArticulo = path.basename(file, ext);
        return pool.request()
          .input('RutaImagen', file)
          .input('CodigoArticulo', codigoArticulo)
          .query(`UPDATE Articulos SET RutaImagen = @RutaImagen WHERE CodigoArticulo = @CodigoArticulo`);
      }).filter(Boolean);

      updates.push(Promise.allSettled(batchUpdates));
    }

    await Promise.all(updates);
    console.log('✅ Sincronización de imágenes completada');
  } catch (error) {
    console.error('❌ Error en syncImagesWithDB:', error);
  }
};

module.exports = {
  getProducts,
  syncImagesWithDB,
  preCacheImages,
  getProductImage // Exportar para uso externo
};

// Iniciar pre-cache al cargar el módulo
preCacheImages().catch(console.error);