const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/Sage200db');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const IMAGE_FOLDER = path.join(__dirname, '../public/images');

// Cache en memoria para productos e IVA
let productsCache = null;
let ivaCache = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

// Nueva función para cargar todos los grupos de IVA de una vez
const loadAllIvaGroups = async (pool) => {
  try {
    const ivaResult = await pool.request().query(`
      SELECT GrupoIva, CodigoIvasinRecargo
      FROM GrupoIva 
      WHERE FechaInicio = (
        SELECT MAX(FechaInicio) 
        FROM GrupoIva gi 
        WHERE gi.GrupoIva = GrupoIva.GrupoIva
      )
    `);
    
    const ivaMap = new Map();
    ivaResult.recordset.forEach(row => {
      ivaMap.set(row.GrupoIva, row.CodigoIvasinRecargo);
    });
    
    return ivaMap;
  } catch (error) {
    console.error('Error loading IVA groups:', error);
    return new Map(); // Retorna mapa vacío en caso de error
  }
};

// Función optimizada para procesar imágenes en lote
const processProductImages = async (products, pool) => {
  const updatePromises = [];
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';

  for (const product of products) {
    const codigo = product.CodigoArticulo;
    const dbImage = product.RutaImagen;
    const imagenFisica = await getProductImage(codigo);

    let finalImage = 'default.jpg';

    if (imagenFisica) {
      finalImage = imagenFisica;
      if (imagenFisica !== dbImage) {
        // Acumular promesas de actualización, no ejecutarlas inmediatamente
        updatePromises.push(
          pool.request()
            .input('RutaImagen', imagenFisica)
            .input('CodigoArticulo', codigo)
            .query(`
              UPDATE Articulos
              SET RutaImagen = @RutaImagen
              WHERE CodigoArticulo = @CodigoArticulo
            `)
        );
      }
    } else if (dbImage) {
      finalImage = dbImage;
    }

    product.RutaImagen = `${serverUrl}/images/${finalImage}`;
  }

  // Ejecutar todas las actualizaciones en paralelo
  if (updatePromises.length > 0) {
    try {
      await Promise.all(updatePromises);
      console.log(`✅ Actualizadas ${updatePromises.length} imágenes`);
    } catch (error) {
      console.error('Error actualizando imágenes:', error);
    }
  }

  return products;
};

const getProducts = async (req, res) => {
  try {
    const pool = await getPool();
    
    // Verificar cache primero
    const now = Date.now();
    if (productsCache && ivaCache && (now - lastCacheUpdate) < CACHE_DURATION) {
      console.log('✅ Sirviendo productos desde cache');
      return res.status(200).json({
        products: productsCache,
        fromCache: true,
        cacheTimestamp: lastCacheUpdate
      });
    }

    console.time('ProductQuery');
    const result = await pool.request()
      .input('CodigoEmpresa', 9999)
      .query(`
        SELECT 
          a.CodigoArticulo, 
          a.DescripcionArticulo, 
          a.CodigoProveedor, 
          a.PrecioVenta, 
          a.PrecioVentaconIVA1,
          a.GrupoIva,
          a.RutaImagen,
          p.RazonSocial AS NombreProveedor,
          a.CodigoFamilia,
          a.CodigoSubfamilia
        FROM Articulos a
        LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
        WHERE a.CodigoEmpresa = @CodigoEmpresa
        ORDER BY a.DescripcionArticulo
      `);
    console.timeEnd('ProductQuery');

    console.log(`📦 Obtenidos ${result.recordset.length} productos de la base de datos`);

    // Cargar todos los grupos de IVA una sola vez
    console.time('IVALoad');
    ivaCache = await loadAllIvaGroups(pool);
    console.timeEnd('IVALoad');

    console.time('ImageProcessing');
    const productsWithImages = await processProductImages(result.recordset, pool);
    console.timeEnd('ImageProcessing');

    // Procesar productos y asignar IVA desde el cache
    console.time('ProductProcessing');
    const updatedProducts = productsWithImages.map(product => {
      const porcentajeIva = ivaCache.get(product.GrupoIva) || 21;

      return {
        ...product,
        Precio: product.PrecioVentaconIVA1,
        PrecioVenta: product.PrecioVentaconIVA1,
        PorcentajeIva: parseFloat(porcentajeIva)
      };
    });
    console.timeEnd('ProductProcessing');

    // Actualizar cache
    productsCache = updatedProducts;
    lastCacheUpdate = Date.now();

    console.log('✅ Productos procesados y cache actualizado');

    res.status(200).json({
      products: updatedProducts,
      fromCache: false,
      total: updatedProducts.length,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    
    // En caso de error, intentar servir desde cache si existe
    if (productsCache) {
      console.log('🔄 Sirviendo desde cache debido a error');
      return res.status(200).json({
        products: productsCache,
        fromCache: true,
        error: 'Error en tiempo real, mostrando datos cacheados'
      });
    }
    
    res.status(500).json({
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Nuevo endpoint para productos paginados (opcional, para mejor rendimiento)
const getProductsPaginated = async (req, res) => {
  try {
    const pool = await getPool();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.request()
      .input('CodigoEmpresa', 9999)
      .input('Offset', offset)
      .input('Limit', limit)
      .query(`
        SELECT 
          a.CodigoArticulo, 
          a.DescripcionArticulo, 
          a.CodigoProveedor, 
          a.PrecioVenta, 
          a.PrecioVentaconIVA1,
          a.GrupoIva,
          a.RutaImagen,
          p.RazonSocial AS NombreProveedor,
          a.CodigoFamilia,
          a.CodigoSubfamilia
        FROM Articulos a
        LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
        WHERE a.CodigoEmpresa = @CodigoEmpresa
        ORDER BY a.DescripcionArticulo
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
      `);

    // Contar total para paginación
    const countResult = await pool.request()
      .input('CodigoEmpresa', 9999)
      .query(`
        SELECT COUNT(*) as Total
        FROM Articulos a
        WHERE a.CodigoEmpresa = @CodigoEmpresa
      `);

    const total = countResult.recordset[0].Total;
    const totalPages = Math.ceil(total / limit);

    // Cargar IVA si no está en cache
    if (!ivaCache) {
      ivaCache = await loadAllIvaGroups(pool);
    }

    const productsWithImages = await processProductImages(result.recordset, pool);
    
    const updatedProducts = productsWithImages.map(product => {
      const porcentajeIva = ivaCache.get(product.GrupoIva) || 21;

      return {
        ...product,
        Precio: product.PrecioVentaconIVA1,
        PrecioVenta: product.PrecioVentaconIVA1,
        PorcentajeIva: parseFloat(porcentajeIva)
      };
    });

    res.status(200).json({
      products: updatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error al obtener productos paginados:', error);
    res.status(500).json({
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para limpiar cache manualmente
const clearCache = async (req, res) => {
  productsCache = null;
  ivaCache = null;
  lastCacheUpdate = 0;
  console.log('✅ Cache de productos limpiado manualmente');
  res.status(200).json({ success: true, message: 'Cache limpiado correctamente' });
};

const syncImagesWithDB = async () => {
  const files = await fs.promises.readdir(IMAGE_FOLDER);
  const pool = await getPool();

  const updatePromises = [];
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;

    const codigoArticulo = path.basename(file, ext);

    updatePromises.push(
      pool.request()
        .input('RutaImagen', file)
        .input('CodigoArticulo', codigoArticulo)
        .query(`
          UPDATE Articulos
          SET RutaImagen = @RutaImagen
          WHERE CodigoArticulo = @CodigoArticulo
        `)
    );
  }

  // Ejecutar en paralelo
  await Promise.all(updatePromises);
  console.log(`✅ ${updatePromises.length} imágenes sincronizadas con la base de datos`);
};

module.exports = {
  getProducts,
  getProductsPaginated,
  clearCache,
  syncImagesWithDB
};