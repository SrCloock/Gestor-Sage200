const { getPool } = require('../db/Sage200db');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
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
        a.PrecioVenta,
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

const createOffer = async (req, res) => {
  try {
    const { items, deliveryDate, discountType, discountValue, subtotal, iva, total } = req.body;
    
    // Verificar autenticación usando la sesión
    if (!req.session.user || !req.session.user.codigoCliente) {
      return res.status(401).json({ message: 'Cliente no autenticado' });
    }

    const user = req.session.user;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No hay productos en la oferta' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();

      // Calcular número de oferta (secuencial)
      const nextNumQuery = await transaction.request().query(`
        SELECT MAX(NumeroOferta) + 1 AS nextNum 
        FROM CabeceraOfertaCliente 
        WHERE SerieOferta = 'WEB' AND EjercicioOferta = YEAR(GETDATE())
      `);
      
      const nextNum = nextNumQuery.recordset[0].nextNum || 1;

      // Insertar cabecera
      await transaction.request()
        .input('CodigoEmpresa', '001')
        .input('EjercicioOferta', new Date().getFullYear())
        .input('SerieOferta', 'WEB')
        .input('NumeroOferta', nextNum)
        .input('FechaOferta', new Date())
        .input('CodigoCliente', user.codigoCliente)
        .input('BaseImponible', subtotal)
        .input('Estado', 'Pendiente')
        .input('PorcentajeDescuento', discountType === 'percent' ? discountValue : 0)
        .input('TotalIva', iva)
        .input('ImporteLiquido', total)
        .input('FechaEntrega', deliveryDate || null)
        .query(`
          INSERT INTO CabeceraOfertaCliente (
            CodigoEmpresa,
            EjercicioOferta,
            SerieOferta,
            NumeroOferta,
            FechaOferta,
            CodigoCliente,
            BaseImponible,
            Estado,
            [%Descuento],
            TotalIva,
            ImporteLiquido,
            FechaEntrega
          ) 
          VALUES (
            @CodigoEmpresa,
            @EjercicioOferta,
            @SerieOferta,
            @NumeroOferta,
            @FechaOferta,
            @CodigoCliente,
            @BaseImponible,
            @Estado,
            @PorcentajeDescuento,
            @TotalIva,
            @ImporteLiquido,
            @FechaEntrega
          )
        `);

      // Insertar líneas
      for (const [index, item] of items.entries()) {
        await transaction.request()
          .input('CodigoEmpresa', '001')
          .input('EjercicioOferta', new Date().getFullYear())
          .input('SerieOferta', 'WEB')
          .input('NumeroOferta', nextNum)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', item.DescripcionArticulo)
          .input('UnidadesPedidas', item.Cantidad)
          .input('Precio', item.PrecioVenta)
          .input('PorcentajeDescuento', discountType === 'percent' ? discountValue : 0)
          .input('ImporteNeto', item.PrecioVenta * item.Cantidad)
          .query(`
            INSERT INTO LineasOfertaCliente (
              CodigoEmpresa,
              EjercicioOferta,
              SerieOferta,
              NumeroOferta,
              Orden,
              CodigoArticulo,
              DescripcionArticulo,
              UnidadesPedidas,
              Precio,
              [%Descuento],
              ImporteNeto
            ) 
            VALUES (
              @CodigoEmpresa,
              @EjercicioOferta,
              @SerieOferta,
              @NumeroOferta,
              @Orden,
              @CodigoArticulo,
              @DescripcionArticulo,
              @UnidadesPedidas,
              @Precio,
              @PorcentajeDescuento,
              @ImporteNeto
            )
          `);
      }

      await transaction.commit();
      
      res.status(201).json({
        message: 'Oferta creada con éxito',
        offerId: nextNum,
        serieOferta: `WEB-${nextNum}`
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error en transacción:', error);
      res.status(500).json({
        error: 'Error al crear oferta',
        details: error.message
      });
    }

  } catch (error) {
    console.error('Error al crear oferta:', error);
    res.status(500).json({
      error: 'Error al crear oferta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const syncImagesWithDB = async () => {
  const files = fs.readdirSync(IMAGE_FOLDER);
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
  createOffer,
  syncImagesWithDB
};