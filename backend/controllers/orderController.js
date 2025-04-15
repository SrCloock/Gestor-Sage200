const { getPool } = require('../db/Sage200db');

const createOrder = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const { items } = req.body;
  const { codigoCliente, cifDni } = req.session.user;

  try {
    const pool = await getPool();
    
    // 1. Crear cabecera del pedido
    const cabeceraResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .input('CifDni', cifDni)
      .query(`
        INSERT INTO CabeceraPedidoCliente (
          CodigoEmpresa, EjercicioPedido, SeriePedido, FechaPedido, 
          NumeroPedido, CodigoCliente, SiglaNacion, CifDni, RazonSocial
        ) 
        OUTPUT INSERTED.NumeroPedido
        VALUES (
          1, YEAR(GETDATE()), 'WEB', GETDATE(), 
          NEXT VALUE FOR SecuenciaPedidos, @CodigoCliente, 'ES', @CifDni, 
          (SELECT RazonSocial FROM CLIENTES WHERE CodigoCliente = @CodigoCliente)
        )
      `);

    const numeroPedido = cabeceraResult.recordset[0].NumeroPedido;

    // 2. Insertar líneas de pedido
    for (const item of items) {
      await pool.request()
        .input('NumeroPedido', numeroPedido)
        .input('CodigoArticulo', item.CodigoArticulo)
        .input('Cantidad', item.Cantidad)
        .input('Precio', item.PrecioCompra)
        .query(`
          INSERT INTO LineasPedidoCliente (
            CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
            FechaRegistro, FechaPedido, CodigoArticulo, DescripcionArticulo,
            Cantidad, PrecioCompra, CodigoProveedor
          )
          VALUES (
            1, YEAR(GETDATE()), 'WEB', @NumeroPedido, 
            (SELECT ISNULL(MAX(Orden), 0) + 1 FROM LineasPedidoCliente 
              WHERE NumeroPedido = @NumeroPedido),
            GETDATE(), GETDATE(), @CodigoArticulo, 
            (SELECT DescripcionArticulo FROM Articulos WHERE CodigoArticulo = @CodigoArticulo),
            @Cantidad, @Precio, 
            (SELECT CodigoProveedor FROM Articulos WHERE CodigoArticulo = @CodigoArticulo)
          )
        `);
    }

    res.status(201).json({ 
      success: true, 
      orderId: numeroPedido 
    });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
};

const getOrders = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const { codigoCliente } = req.session.user;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .query(`
        SELECT 
          c.NumeroPedido, c.FechaPedido, c.NumeroLineas,
          STRING_AGG(l.DescripcionArticulo, ', ') AS Productos
        FROM CabeceraPedidoCliente c
        JOIN LineasPedidoCliente l ON c.NumeroPedido = l.NumeroPedido
        WHERE c.CodigoCliente = @CodigoCliente
        GROUP BY c.NumeroPedido, c.FechaPedido, c.NumeroLineas
        ORDER BY c.FechaPedido DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

module.exports = { createOrder, getOrders };