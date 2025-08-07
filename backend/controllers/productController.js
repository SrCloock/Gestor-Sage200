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
      const imagenFisica = await getProductImage(codigo);

      let finalImage = 'default.jpg';

      if (imagenFisica) {
        finalImage = imagenFisica;

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

const syncImagesWithDB = async () => {
  const files = await fs.promises.readdir(IMAGE_FOLDER);
  const pool = await getPool();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;

    const codigoArticulo = path.basename(file, ext);

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