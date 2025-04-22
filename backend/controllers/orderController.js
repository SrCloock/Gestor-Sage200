const { getPool } = require('../db/Sage200db');

// Función para crear pedido
const createOrder = async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El pedido no contiene items válidos'
    });
  }

  if (!items[0]?.CodigoCliente || !items[0]?.CifDni) {
    return res.status(400).json({
      success: false,
      message: 'Datos del cliente incompletos'
    });
  }

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Verificar cliente
      const clienteResult = await transaction.request()
        .input('CodigoCliente', items[0].CodigoCliente)
        .input('CifDni', items[0].CifDni)
        .query(`
          SELECT RazonSocial 
          FROM CLIENTES 
          WHERE CodigoCliente = @CodigoCliente 
          AND CifDni = @CifDni
          AND CodigoCategoriaCliente_ = 'EMP'
        `);

      if (clienteResult.recordset.length === 0) {
        throw new Error('Cliente no encontrado o no tiene permisos');
      }

      const razonSocial = clienteResult.recordset[0].RazonSocial;

      // 2. Crear cabecera del pedido
      await transaction.request()
        .input('CodigoCliente', items[0].CodigoCliente)
        .input('CifDni', items[0].CifDni)
        .input('RazonSocial', razonSocial)
        .query(`
          INSERT INTO CabeceraPedidoCliente (
            CodigoEmpresa, EjercicioPedido, SeriePedido, FechaPedido, 
            NumeroPedido, CodigoCliente, SiglaNacion, CifDni, RazonSocial
          )
          VALUES (
            1, YEAR(GETDATE()), 'PRUEBA', GETDATE(),
            ISNULL((SELECT MAX(NumeroPedido) FROM CabeceraPedidoCliente WHERE EjercicioPedido = YEAR(GETDATE())) + 1, 1),
            @CodigoCliente, 'ES', @CifDni, @RazonSocial
          )
        `);

      // Obtener el ID del pedido recién creado
      const pedidoResult = await transaction.request()
        .input('CodigoCliente', items[0].CodigoCliente)
        .query(`
          SELECT TOP 1 NumeroPedido 
          FROM CabeceraPedidoCliente 
          WHERE CodigoCliente = @CodigoCliente 
          ORDER BY FechaPedido DESC
        `);

      const numeroPedido = pedidoResult.recordset[0].NumeroPedido;

      // 3. Insertar líneas de pedido
      for (const [index, item] of items.entries()) {
        await transaction.request()
          .input('NumeroPedido', numeroPedido)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', item.DescripcionArticulo)
          .input('UnidadesPedidas', item.Cantidad)
          .input('CodigoProveedor', item.CodigoProveedor)
          .query(`
            INSERT INTO LineasPedidoCliente (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
              FechaRegistro, FechaPedido, CodigoArticulo, DescripcionArticulo,
              UnidadesPedidas, CodigoProveedor
            )
            VALUES (
              1, YEAR(GETDATE()), 'PRUEBA', @NumeroPedido, @Orden,
              GETDATE(), GETDATE(), @CodigoArticulo, @DescripcionArticulo,
              @UnidadesPedidas, @CodigoProveedor
            )
          `);
      }

      await transaction.commit();

      res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.header('Access-Control-Allow-Credentials', true);
      
      return res.status(201).json({
        success: true,
        orderId: numeroPedido,
        message: 'Pedido creado correctamente'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error en la transacción:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error al crear pedido:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar el pedido'
    });
  }
};

// Función para obtener pedidos
const getOrders = async (req, res) => {
  try {
    const pool = await getPool();
    const { codigoCliente } = req.query; // Ahora viene por query params

    if (!codigoCliente) {
      return res.status(400).json({
        success: false,
        message: 'Código de cliente no proporcionado'
      });
    }

    // Obtener cabeceras de pedidos con conteo de líneas
    const ordersResult = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          COUNT(l.Orden) AS NumeroLineas
        FROM CabeceraPedidoCliente c
        LEFT JOIN LineasPedidoCliente l ON 
          c.CodigoEmpresa = l.CodigoEmpresa AND
          c.EjercicioPedido = l.EjercicioPedido AND
          c.SeriePedido = l.SeriePedido AND
          c.NumeroPedido = l.NumeroPedido
        WHERE c.CodigoCliente = @CodigoCliente
        GROUP BY 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial
        ORDER BY c.FechaPedido DESC
      `);

    // Obtener detalles de productos para cada pedido
    const ordersWithDetails = await Promise.all(
      ordersResult.recordset.map(async (order) => {
        const detailsResult = await pool.request()
          .input('NumeroPedido', order.NumeroPedido)
          .query(`
            SELECT 
              CodigoArticulo,
              DescripcionArticulo,
              UnidadesPedidas
            FROM LineasPedidoCliente
            WHERE NumeroPedido = @NumeroPedido
            ORDER BY Orden
          `);

        return {
          ...order,
          Productos: detailsResult.recordset
        };
      })
    );

    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', true);
    
    return res.status(200).json({
      success: true,
      orders: ordersWithDetails
    });

  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener los pedidos'
    });
  }
};

// Función para obtener detalles de un pedido específico
const getOrderDetails = async (req, res) => {
  try {
    const pool = await getPool();
    const { numeroPedido } = req.params;
    const { codigoCliente } = req.query;

    if (!codigoCliente) {
      return res.status(400).json({
        success: false,
        message: 'Código de cliente no proporcionado'
      });
    }

    // Verificar que el pedido pertenece al cliente
    const orderResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .input('CodigoCliente', codigoCliente)
      .query(`
        SELECT TOP 1 
          NumeroPedido,
          FechaPedido,
          RazonSocial
        FROM CabeceraPedidoCliente
        WHERE NumeroPedido = @NumeroPedido
        AND CodigoCliente = @CodigoCliente
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Obtener líneas del pedido
    const linesResult = await pool.request()
      .input('NumeroPedido', numeroPedido)
      .query(`
        SELECT 
          CodigoArticulo,
          DescripcionArticulo,
          UnidadesPedidas,
          CodigoProveedor
        FROM LineasPedidoCliente
        WHERE NumeroPedido = @NumeroPedido
        ORDER BY Orden
      `);

    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', true);
    
    return res.status(200).json({
      success: true,
      order: {
        ...orderResult.recordset[0],
        Productos: linesResult.recordset
      }
    });

  } catch (error) {
    console.error('Error al obtener detalle del pedido:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener el detalle del pedido'
    });
  }
};

module.exports = { createOrder, getOrders, getOrderDetails };