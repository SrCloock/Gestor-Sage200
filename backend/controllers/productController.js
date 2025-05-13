// backend/controllers/productController.js

const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/Sage200db');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
const IMAGE_FOLDER = path.join(__dirname, '../public/images');

const buscarImagenFisica = (codigoArticulo) => {
  for (const ext of IMAGE_EXTENSIONS) {
    const fileName = `${codigoArticulo}${ext}`;
    const filePath = path.join(IMAGE_FOLDER, fileName);
    if (fs.existsSync(filePath)) {
      return fileName;
    }
  }
  return null;
};

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

    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const updatedProducts = [];

    for (const product of result.recordset) {
      const codigo = product.CodigoArticulo;
      const dbImage = product.RutaImagen;
      const imagenFisica = buscarImagenFisica(codigo);

      let finalImage = 'default.jpg'; // Valor por defecto

      if (imagenFisica) {
        finalImage = imagenFisica;

        // Si la imagen física es diferente a la de la BD, actualizamos la BD
        if (imagenFisica !== dbImage) {
          await pool.request()
            .input('RutaImagen', imagenFisica)
            .input('CodigoArticulo', codigo)
            .query(`
              UPDATE Articulos
              SET RutaImagen = @RutaImagen
              WHERE CodigoArticulo = @CodigoArticulo
            `);
        }
      } else if (dbImage) {
        finalImage = dbImage;
      }

      updatedProducts.push({
        ...product,
        RutaImagen: `${serverUrl}/images/${finalImage}`
      });
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

// Esta función se puede ejecutar al iniciar el servidor si lo necesitas
const syncImagesWithDB = async () => {
  const files = fs.readdirSync(IMAGE_FOLDER);
  const pool = await getPool();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;

    const codigoArticulo = path.basename(file, ext);

    // Siempre sincroniza con la última imagen encontrada
    await pool.request()
      .input('RutaImagen', file)
      .input('CodigoArticulo', codigoArticulo)
      .query(`
        UPDATE Articulos
        SET RutaImagen = @RutaImagen
        WHERE CodigoArticulo = @CodigoArticulo
      `);
  }

  console.log('✅ Imágenes sincronizadas con la base de datos');
};

module.exports = {
  getProducts,
  syncImagesWithDB
};
