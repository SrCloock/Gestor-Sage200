const { getPool } = require('../db/Sage200db');
const path = require('path');
const fs = require('fs');

const getProducts = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        a.CodigoArticulo, 
        a.DescripcionArticulo, 
        a.CodigoProveedor, 
        a.PrecioCompra, 
        a.RutaImagen,
        p.RazonSocial AS NombreProveedor
      FROM Articulos a
      JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
      ORDER BY a.DescripcionArticulo
    `);
    
    const productsWithImages = await Promise.all(
      result.recordset.map(async (product) => {
        const imagesDir = path.join(__dirname, '../../public/images');
        let finalImageUrl = '/images/default-product.jpg';

        // 1. Verificar imagen registrada en BD
        if (product.RutaImagen) {
          const dbImagePath = path.join(imagesDir, product.RutaImagen);
          if (fs.existsSync(dbImagePath)) {
            finalImageUrl = `/images/${product.RutaImagen}`;
            return { ...product, imageUrl: finalImageUrl };
          }
        }

        // 2. Buscar por código de artículo
        const codeBasedImages = [
          `${product.CodigoArticulo}.jpg`,
          `${product.CodigoArticulo}.jpeg`,
          `${product.CodigoArticulo}.png`,
          `${product.CodigoArticulo}.webp`
        ];

        for (const filename of codeBasedImages) {
          const imagePath = path.join(imagesDir, filename);
          if (fs.existsSync(imagePath)) {
            finalImageUrl = `/images/${filename}`;
            
            // Actualizar BD para futuras consultas
            try {
              await pool.request()
                .input('codigo', product.CodigoArticulo)
                .input('ruta', filename)
                .query(`
                  UPDATE Articulos 
                  SET RutaImagen = @ruta 
                  WHERE CodigoArticulo = @codigo
                `);
              console.log(`🔄 Actualizada ruta imagen para ${product.CodigoArticulo}`);
            } catch (updateError) {
              console.error(`⚠️ No se pudo actualizar ruta para ${product.CodigoArticulo}:`, updateError.message);
            }
            
            break;
          }
        }

        return { ...product, imageUrl: finalImageUrl };
      })
    );

    res.status(200).json(productsWithImages);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ 
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { getProducts };