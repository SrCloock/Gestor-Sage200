const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/Sage200db');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const IMAGE_FOLDER = path.join(__dirname, '../public/images');

// Función mejorada para verificar existencia de archivos
const fileExists = (filePath) => {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
};

// Función optimizada para obtener imagen del producto
const getProductImage = async (codigoArticulo) => {
  for (const ext of IMAGE_EXTENSIONS) {
    const filePath = path.join(IMAGE_FOLDER, `${codigoArticulo}${ext}`);
    if (await fileExists(filePath)) {
      return `${codigoArticulo}${ext}`;
    }
  }
  return null;
};

// Controlador principal de productos - MEJORADO
const getProducts = async (req, res) => {
  try {
    const pool = await getPool();
    
    // Consulta mejorada con PrecioVenta
    const result = await pool.request().query(`
      SELECT 
        a.CodigoArticulo, 
        a.DescripcionArticulo, 
        a.CodigoProveedor, 
        a.PrecioCompra, 
        a.PrecioVenta,  -- NUEVO CAMPO AÑADIDO
        a.RutaImagen,
        p.RazonSocial AS NombreProveedor
      FROM Articulos a
      LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
      WHERE a.CodigoArticulo IS NOT NULL 
        AND a.DescripcionArticulo IS NOT NULL
      ORDER BY a.DescripcionArticulo
    `);

    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const updatedProducts = [];

    // Procesamiento optimizado de productos
    for (const product of result.recordset) {
      try {
        const codigo = product.CodigoArticulo;
        
        if (!codigo) continue; // Saltar productos sin código

        const dbImage = product.RutaImagen;
        const imagenFisica = await getProductImage(codigo);

        let finalImage = 'default.jpg';

        if (imagenFisica) {
          finalImage = imagenFisica;

          // Sincronización mejorada con manejo de errores
          if (imagenFisica !== dbImage) {
            try {
              await pool.request()
                .input('RutaImagen', imagenFisica)
                .input('CodigoArticulo', codigo)
                .query(`
                  UPDATE Articulos
                  SET RutaImagen = @RutaImagen
                  WHERE CodigoArticulo = @CodigoArticulo
                `);
            } catch (updateError) {
              console.warn(`No se pudo actualizar imagen para ${codigo}:`, updateError.message);
            }
          }
        } else if (dbImage) {
          finalImage = dbImage;
        }

        // Producto con todos los datos necesarios
        updatedProducts.push({
          ...product,
          RutaImagen: `${serverUrl}/images/${finalImage}`,
          PrecioVenta: product.PrecioVenta || product.PrecioCompra // Fallback a PrecioCompra
        });
      } catch (productError) {
        console.warn(`Error procesando producto ${product.CodigoArticulo}:`, productError.message);
        continue; // Continuar con el siguiente producto
      }
    }

    res.status(200).json(updatedProducts);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función de sincronización mejorada
const syncImagesWithDB = async () => {
  try {
    const files = await fs.promises.readdir(IMAGE_FOLDER);
    const pool = await getPool();

    const imageUpdates = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) continue;

      const codigoArticulo = path.basename(file, ext);
      
      imageUpdates.push(
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

    // Ejecutar todas las actualizaciones en paralelo
    await Promise.allSettled(imageUpdates);
    
    console.log('✅ Imágenes sincronizadas con la base de datos');
  } catch (error) {
    console.error('❌ Error en sincronización de imágenes:', error);
  }
};

module.exports = {
  getProducts,
  syncImagesWithDB
};