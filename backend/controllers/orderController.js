const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');

exports.createOrder = async (req, res, next) => {
  const { CodigoCliente, items } = req.body;

  if (!CodigoCliente || !items || items.length === 0) {
    return next(new AppError('Código de cliente y items son requeridos', 400));
  }

  try {
    // Iniciar transacción
    const transaction = new sql.Transaction(await pool.connect());
    await transaction.begin();

    try {
      // 1. Obtener datos del cliente
      const clientRequest = new sql.Request(transaction);
      const clientResult = await clientRequest
        .input('CodigoCliente', CodigoCliente)
        .query(`
          SELECT CodigoEmpresa, RazonSocial 
          FROM CLIENTES 
          WHERE CodigoCliente = @CodigoCliente
        `);

      if (clientResult.recordset.length === 0) {
        throw new AppError('Cliente no encontrado', 404);
      }

      const { CodigoEmpresa, RazonSocial } = clientResult.recordset[0];

      // 2. Obtener siguiente número de pedido
      const orderRequest = new sql.Request(transaction);
      const orderResult = await orderRequest
        .input('CodigoEmpresa', CodigoEmpresa)
        .query(`
          SELECT MAX(NumeroPedido) as lastOrder 
          FROM CabeceraPedidoCliente 
          WHERE CodigoEmpresa = @CodigoEmpresa
        `);

      const NumeroPedido = (orderResult.recordset[0].lastOrder || 0) + 1;
      const EjercicioPedido = new Date().getFullYear();
      const SeriePedido = 'A';
      const FechaPedido = new Date().toISOString();

      // 3. Insertar cabecera del pedido
      const headerRequest = new sql.Request(transaction);
      await headerRequest
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', SeriePedido)
        .input('NumeroPedido', NumeroPedido)
        .input('CodigoCliente', CodigoCliente)
        .input('FechaPedido', FechaPedido)
        .input('RazonSocial', RazonSocial)
        .input('Estado', 'Pendiente')
        .query(`
          INSERT INTO CabeceraPedidoCliente (
            CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
            CodigoCliente, FechaPedido, RazonSocial, Estado
          )
          VALUES (
            @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
            @CodigoCliente, @FechaPedido, @RazonSocial, @Estado
          )
        `);

      // 4. Insertar líneas del pedido
      for (const [index, item] of items.entries()) {
        const lineRequest = new sql.Request(transaction);
        await lineRequest
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', SeriePedido)
          .input('NumeroPedido', NumeroPedido)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.id)
          .input('Cantidad', item.quantity)
          .input('Precio', item.price)
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

      // Commit de la transacción
      await transaction.commit();

      res.status(201).json({
        status: 'success',
        data: {
          CodigoEmpresa,
          EjercicioPedido,
          SeriePedido,
          NumeroPedido
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(new AppError(error.message || 'Error al crear el pedido', 500));
  }
};

exports.getOrdersByClient = async (req, res, next) => {
  const { CodigoCliente } = req.params;

  try {
    const result = await pool.request()
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT 
          cpc.CodigoEmpresa,
          cpc.EjercicioPedido,
          cpc.SeriePedido,
          cpc.NumeroPedido,
          cpc.FechaPedido,
          cpc.RazonSocial,
          cpc.Estado,
          (SELECT SUM(lpc.Cantidad * lpc.Precio) 
           FROM LineasPedidoCliente lpc
           WHERE lpc.CodigoEmpresa = cpc.CodigoEmpresa
             AND lpc.EjercicioPedido = cpc.EjercicioPedido
             AND lpc.SeriePedido = cpc.SeriePedido
             AND lpc.NumeroPedido = cpc.NumeroPedido) as Total
        FROM CabeceraPedidoCliente cpc
        WHERE cpc.CodigoCliente = @CodigoCliente
        ORDER BY cpc.FechaPedido DESC
      `);

    res.json({
      status: 'success',
      results: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    next(new AppError('Error al obtener los pedidos', 500));
  }
};

exports.getOrderDetails = async (req, res, next) => {
  const { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido } = req.params;

  try {
    // Cabecera del pedido
    const headerResult = await pool.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioPedido', EjercicioPedido)
      .input('SeriePedido', SeriePedido)
      .input('NumeroPedido', NumeroPedido)
      .query(`
        SELECT 
          cpc.*,
          c.RazonSocial,
          c.Nombre
        FROM CabeceraPedidoCliente cpc
        JOIN CLIENTES c ON cpc.CodigoCliente = c.CodigoCliente
        WHERE cpc.CodigoEmpresa = @CodigoEmpresa
          AND cpc.EjercicioPedido = @EjercicioPedido
          AND cpc.SeriePedido = @SeriePedido
          AND cpc.NumeroPedido = @NumeroPedido
      `);

    if (headerResult.recordset.length === 0) {
      return next(new AppError('Pedido no encontrado', 404));
    }

    // Líneas del pedido
    const linesResult = await pool.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioPedido', EjercicioPedido)
      .input('SeriePedido', SeriePedido)
      .input('NumeroPedido', NumeroPedido)
      .query(`
        SELECT 
          lpc.*,
          ap.NombreArticulo as NombreProducto,
          ap.Descripcion as DescripcionProducto
        FROM LineasPedidoCliente lpc
        JOIN ArticuloProveedor ap ON lpc.CodigoArticulo = ap.CodigoArticulo
        WHERE lpc.CodigoEmpresa = @CodigoEmpresa
          AND lpc.EjercicioPedido = @EjercicioPedido
          AND lpc.SeriePedido = @SeriePedido
          AND lpc.NumeroPedido = @NumeroPedido
        ORDER BY lpc.Orden
      `);

    res.json({
      status: 'success',
      data: {
        header: headerResult.recordset[0],
        lines: linesResult.recordset
      }
    });
  } catch (error) {
    next(new AppError('Error al obtener el detalle del pedido', 500));
  }
};