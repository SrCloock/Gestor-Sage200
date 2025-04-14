const { pool } = require('../config/sage200db');

exports.createOrder = async (req, res) => {
  const { CodigoCliente, items } = req.body;

  try {
    // 1. Obtener datos del cliente
    const clientResult = await pool.request()
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT CodigoEmpresa, RazonSocial 
        FROM CLIENTES 
        WHERE CodigoCliente = @CodigoCliente
      `);

    if (clientResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const { CodigoEmpresa, RazonSocial } = clientResult.recordset[0];

    // 2. Generar número de pedido
    const orderNumberResult = await pool.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .query(`
        SELECT ISNULL(MAX(NumeroPedido), 0) + 1 AS NuevoNumero
        FROM CabeceraPedidoCliente
        WHERE CodigoEmpresa = @CodigoEmpresa
      `);

    const NumeroPedido = orderNumberResult.recordset[0].NuevoNumero;
    const FechaPedido = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 3. Insertar cabecera
    await pool.request()
      .input('CodigoEmpresa', CodigoEmpresa)
      .input('NumeroPedido', NumeroPedido)
      .input('CodigoCliente', CodigoCliente)
      .input('RazonSocial', RazonSocial)
      .input('FechaPedido', FechaPedido)
      .query(`
        INSERT INTO CabeceraPedidoCliente (
          CodigoEmpresa, NumeroPedido, CodigoCliente, 
          RazonSocial, FechaPedido, Estado
        ) VALUES (
          @CodigoEmpresa, @NumeroPedido, @CodigoCliente,
          @RazonSocial, @FechaPedido, 'Pendiente'
        )
      `);

    // 4. Insertar líneas
    for (const [index, item] of items.entries()) {
      await pool.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('NumeroPedido', NumeroPedido)
        .input('Orden', index + 1)
        .input('CodigoArticulo', item.id)
        .input('Cantidad', item.quantity)
        .input('Precio', item.price)
        .query(`
          INSERT INTO LineasPedidoCliente (
            CodigoEmpresa, NumeroPedido, Orden,
            CodigoArticulo, Cantidad, Precio
          ) VALUES (
            @CodigoEmpresa, @NumeroPedido, @Orden,
            @CodigoArticulo, @Cantidad, @Precio
          )
        `);
    }

    res.json({ 
      success: true,
      order: {
        CodigoEmpresa,
        NumeroPedido,
        FechaPedido
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrderHistory = async (req, res) => {
  const { CodigoCliente } = req.params;

  try {
    const result = await pool.request()
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT 
          p.NumeroPedido,
          p.FechaPedido,
          p.Estado,
          SUM(l.Cantidad * l.Precio) AS Total
        FROM CabeceraPedidoCliente p
        JOIN LineasPedidoCliente l ON p.NumeroPedido = l.NumeroPedido
        WHERE p.CodigoCliente = @CodigoCliente
        GROUP BY p.NumeroPedido, p.FechaPedido, p.Estado
        ORDER BY p.FechaPedido DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};