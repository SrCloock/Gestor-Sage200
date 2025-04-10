const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');
const sql = require('mssql');

exports.createOrder = async (req, res, next) => {
  const { CodigoCliente, items } = req.body;

  if (!CodigoCliente || !items || items.length === 0) {
    return next(new AppError('Datos incompletos', 400));
  }

  const transaction = new sql.Transaction(await pool.connect());
  try {
    await transaction.begin();

    // 1. Obtener datos del cliente
    const clientResult = await new sql.Request(transaction)
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT CodigoEmpresa, RazonSocial, CifEuropeo, Nombre
        FROM CLIENTES
        WHERE CodigoCliente = @CodigoCliente
      `);

    if (clientResult.recordset.length === 0) {
      throw new AppError('Cliente no encontrado', 404));
    }

    const { CodigoEmpresa, RazonSocial, CifEuropeo, Nombre } = clientResult.recordset[0];

    // 2. Generar número de pedido
    const orderNumberResult = await new sql.Request(transaction)
      .input('CodigoEmpresa', CodigoEmpresa)
      .query(`
        SELECT ISNULL(MAX(NumeroPedido), 0) + 1 AS NuevoNumero
        FROM CabeceraPedidoCliente
        WHERE CodigoEmpresa = @CodigoEmpresa
      `);

    const NumeroPedido = orderNumberResult.recordset[0].NuevoNumero;
    const EjercicioPedido = new Date().getFullYear();
    const SeriePedido = 'WEB';

    // 3. Insertar cabecera
    await new sql.Request(transaction)
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('EjercicioPedido', EjercicioPedido)
      .input('SeriePedido', SeriePedido)
      .input('NumeroPedido', NumeroPedido)
      .input('CodigoCliente', CodigoCliente)
      .input('RazonSocial', RazonSocial)
      .input('CifEuropeo', CifEuropeo)
      .input('Nombre', Nombre)
      .input('FechaPedido', new Date())
      .query(`
        INSERT INTO CabeceraPedidoCliente (
          CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
          CodigoCliente, RazonSocial, CifEuropeo, Nombre, FechaPedido
        ) VALUES (
          @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
          @CodigoCliente, @RazonSocial, @CifEuropeo, @Nombre, @FechaPedido
        )
      `);

    // 4. Insertar líneas
    for (const [index, item] of items.entries()) {
      await new sql.Request(transaction)
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
          ) VALUES (
            @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
            @Orden, @CodigoArticulo, @Cantidad, @Precio
          )
        `);
    }

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      data: { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido }
    });
  } catch (error) {
    await transaction.rollback();
    next(new AppError(error.message, 500));
  }
};