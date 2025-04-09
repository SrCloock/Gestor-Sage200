const AppError = require('../utils/AppError');
const { pool } = require('../config/sage200db');
const logger = require('../utils/logger');

const validateOrderItems = (items) => {
  if (!Array.isArray(items) throw new AppError('Los items deben ser un array', 400);
  return items.every(item => 
    item.CodigoArticulo && 
    item.Cantidad > 0 && 
    item.Precio >= 0
  );
};

exports.createOrder = async (req, res, next) => {
  const transaction = await pool.transaction();
  try {
    const { CodigoCliente, items } = req.body;
    
    // Validaciones básicas
    if (!CodigoCliente) throw new AppError('Código de cliente es requerido', 400);
    if (!validateOrderItems(items)) throw new AppError('Items del pedido inválidos', 400);

    await transaction.begin();

    // 1. Obtener datos del cliente
    const clientResult = await transaction.request()
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT CodigoEmpresa, RazonSocial 
        FROM CLIENTES 
        WHERE CodigoCliente = @CodigoCliente
        AND CODIGOCATEGORIACLIENTE_ = 'EMP'
      `);

    if (clientResult.recordset.length === 0) {
      throw new AppError('Cliente no encontrado', 404);
    }

    const { CodigoEmpresa, RazonSocial } = clientResult.recordset[0];

    // 2. Generar número de pedido
    const orderNumberResult = await transaction.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .query(`
        SELECT ISNULL(MAX(NumeroPedido), 0) + 1 AS NuevoNumero
        FROM CabeceraPedidoCliente 
        WHERE CodigoEmpresa = @CodigoEmpresa
      `);

    const NumeroPedido = orderNumberResult.recordset[0].NuevoNumero;
    const EjercicioPedido = new Date().getFullYear();
    const SeriePedido = 'A';
    const FechaPedido = new Date();

    // 3. Crear cabecera del pedido
    await transaction.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioPedido', EjercicioPedido)
      .input('SeriePedido', SeriePedido)
      .input('NumeroPedido', NumeroPedido)
      .input('CodigoCliente', CodigoCliente)
      .input('RazonSocial', RazonSocial)
      .input('FechaPedido', FechaPedido)
      .input('Estado', 'PENDIENTE')
      .query(`
        INSERT INTO CabeceraPedidoCliente (
          CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
          CodigoCliente, RazonSocial, FechaPedido, Estado
        )
        VALUES (
          @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
          @CodigoCliente, @RazonSocial, @FechaPedido, @Estado
        )
      `);

    // 4. Insertar líneas del pedido
    for (const [index, item] of items.entries()) {
      await transaction.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', SeriePedido)
        .input('NumeroPedido', NumeroPedido)
        .input('Orden', index + 1)
        .input('CodigoArticulo', item.CodigoArticulo)
        .input('Cantidad', item.Cantidad)
        .input('Precio', item.Precio)
        .query(`
          INSERT INTO LineasPedidoCliente (
            CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
            Orden, CodigoArticulo, Cantidad, Precio
          )
          VALUES (
            @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
            @Orden, @CodigoArticulo, @Cantidad, @Precio
          )
        `);
    }

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      data: {
        CodigoEmpresa,
        EjercicioPedido,
        SeriePedido,
        NumeroPedido,
        FechaPedido
      }
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error al crear pedido:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { CodigoCliente } = req.params;

    const result = await pool.request()
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT 
          p.CodigoEmpresa, p.EjercicioPedido, p.SeriePedido, p.NumeroPedido,
          p.FechaPedido, p.Estado,
          COUNT(l.CodigoArticulo) AS TotalItems,
          SUM(l.Cantidad * l.Precio) AS Total
        FROM CabeceraPedidoCliente p
        LEFT JOIN LineasPedidoCliente l ON 
          p.CodigoEmpresa = l.CodigoEmpresa AND
          p.EjercicioPedido = l.EjercicioPedido AND
          p.SeriePedido = l.SeriePedido AND
          p.NumeroPedido = l.NumeroPedido
        WHERE p.CodigoCliente = @CodigoCliente
        GROUP BY 
          p.CodigoEmpresa, p.EjercicioPedido, p.SeriePedido, p.NumeroPedido,
          p.FechaPedido, p.Estado
        ORDER BY p.FechaPedido DESC
      `);

    res.status(200).json({
      status: 'success',
      results: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    const { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido } = req.params;

    const headerResult = await pool.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioPedido', EjercicioPedido)
      .input('SeriePedido', SeriePedido)
      .input('NumeroPedido', NumeroPedido)
      .query(`
        SELECT * 
        FROM CabeceraPedidoCliente
        WHERE 
          CodigoEmpresa = @CodigoEmpresa AND
          EjercicioPedido = @EjercicioPedido AND
          SeriePedido = @SeriePedido AND
          NumeroPedido = @NumeroPedido
      `);

    if (headerResult.recordset.length === 0) {
      throw new AppError('Pedido no encontrado', 404);
    }

    const itemsResult = await pool.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioPedido', EjercicioPedido)
      .input('SeriePedido', SeriePedido)
      .input('NumeroPedido', NumeroPedido)
      .query(`
        SELECT 
          l.CodigoArticulo, a.Nombre AS NombreArticulo,
          l.Cantidad, l.Precio, (l.Cantidad * l.Precio) AS TotalLinea
        FROM LineasPedidoCliente l
        JOIN Articulos a ON l.CodigoArticulo = a.Codigo
        WHERE 
          l.CodigoEmpresa = @CodigoEmpresa AND
          l.EjercicioPedido = @EjercicioPedido AND
          l.SeriePedido = @SeriePedido AND
          l.NumeroPedido = @NumeroPedido
        ORDER BY l.Orden
      `);

    res.status(200).json({
      status: 'success',
      data: {
        header: headerResult.recordset[0],
        items: itemsResult.recordset
      }
    });
  } catch (error) {
    next(error);
  }
};