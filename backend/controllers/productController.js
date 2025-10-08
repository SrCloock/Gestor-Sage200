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
    const result = await pool.request()
      .input('CodigoEmpresa', 9999) 
      .query(`
        SELECT 
          a.CodigoArticulo, 
          a.DescripcionArticulo, 
          a.CodigoProveedor, 
          a.PrecioVenta, 
          a.PrecioVentaconIVA1,  -- NUEVO: Precio correcto con IVA
          a.GrupoIva,            -- NUEVO: Grupo IVA del artículo
          a.RutaImagen,
          p.RazonSocial AS NombreProveedor,
          a.CodigoFamilia,
          a.CodigoSubfamilia
        FROM Articulos a
        LEFT JOIN Proveedores p ON a.CodigoProveedor = p.CodigoProveedor
        WHERE a.CodigoEmpresa = @CodigoEmpresa
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

      // NUEVO: Obtener el porcentaje de IVA actual para el GrupoIva
      const ivaResult = await pool.request()
        .input('GrupoIva', product.GrupoIva)
        .query(`
          SELECT TOP 1 CodigoIvasinRecargo 
          FROM GrupoIva 
          WHERE GrupoIva = @GrupoIva 
          ORDER BY FechaInicio DESC
        `);

      const porcentajeIva = ivaResult.recordset[0]?.CodigoIvasinRecargo || 21;

      updatedProducts.push({
        ...product,
        Precio: product.PrecioVentaconIVA1,  // CAMBIADO: Usar PrecioVentaconIVA1
        PrecioVenta: product.PrecioVentaconIVA1,  // CAMBIADO: Usar PrecioVentaconIVA1
        PorcentajeIva: porcentajeIva,  // NUEVO: Incluir porcentaje de IVA
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