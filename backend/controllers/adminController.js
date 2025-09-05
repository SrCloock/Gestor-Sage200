const { getPool } = require('../db/Sage200db');

const getPendingOrders = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        NumeroPedido,
        FechaPedido,
        RazonSocial,
        CifDni,
        NumeroLineas,
        StatusAprobado,
        SeriePedido,
        BaseImponible,
        FechaNecesaria,
        ObservacionesPedido,
        CodigoCliente
      FROM CabeceraPedidoCliente
      WHERE SeriePedido = 'Web' AND StatusAprobado = 0
      ORDER BY FechaPedido DESC
    `);

    console.log('Pedidos pendientes encontrados:', result.recordset.length);

    res.status(200).json({
      success: true,
      orders: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener pedidos pendientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getOrderForReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = await getPool();

    const orderResult = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          c.CifDni,
          c.Domicilio,
          c.CodigoPostal,
          c.Municipio,
          c.Provincia,
          c.StatusAprobado,
          c.ObservacionesPedido,
          c.FechaNecesaria
        FROM CabeceraPedidoCliente c
        WHERE c.NumeroPedido = @NumeroPedido
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    const linesResult = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.Precio,
          l.CodigoProveedor,
          p.RazonSocial as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
        WHERE l.NumeroPedido = @NumeroPedido
        ORDER BY l.Orden
      `);

    res.status(200).json({
      success: true,
      order: {
        ...orderResult.recordset[0],
        Productos: linesResult.recordset
      }
    });
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const approveOrder = async (req, res) => {
  const { orderId } = req.params;
  const { modifiedItems } = req.body;

  try {
    const pool = await getPool();
    
    if (!pool.connected) {
      throw new Error('Conexión a la base de datos no disponible');
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      if (modifiedItems && modifiedItems.length > 0) {
        for (const item of modifiedItems) {
          await transaction.request()
            .input('NumeroPedido', orderId)
            .input('CodigoArticulo', item.CodigoArticulo)
            .input('UnidadesPedidas', item.UnidadesPedidas)
            .query(`
              UPDATE LineasPedidoCliente
              SET UnidadesPedidas = @UnidadesPedidas,
                  UnidadesPendientes = @UnidadesPedidas,
                  Unidades2_ = @UnidadesPedidas,
                  UnidadesPendientesFabricar = @UnidadesPedidas
              WHERE NumeroPedido = @NumeroPedido 
              AND CodigoArticulo = @CodigoArticulo
            `);
        }
      }

      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            c.CodigoEmpresa,
            c.EjercicioPedido,
            c.SeriePedido,
            c.CodigoCliente,
            c.RazonSocial,
            c.Domicilio,
            c.CodigoPostal,
            c.Municipio,
            c.Provincia,
            c.Nacion,
            l.*
          FROM CabeceraPedidoCliente c
          JOIN LineasPedidoCliente l ON c.NumeroPedido = l.NumeroPedido
          WHERE c.NumeroPedido = @NumeroPedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado después de actualizar');
      }

      const order = orderResult.recordset[0];

      const itemsBySupplier = {};
      orderResult.recordset.forEach(item => {
        const supplier = item.CodigoProveedor;
        if (!itemsBySupplier[supplier]) {
          itemsBySupplier[supplier] = [];
        }
        itemsBySupplier[supplier].push(item);
      });

      for (const [supplierCode, items] of Object.entries(itemsBySupplier)) {
        const lastOrderResult = await transaction.request()
          .input('sysGrupo', order.CodigoEmpresa)
          .query(`
            SELECT MAX(sysContadorValor) as UltimoNumero
            FROM LSYSCONTADORES
            WHERE sysGrupo = @sysGrupo
            AND sysNombreContador = 'PEDIDOS_PRO'
          `);

        let numeroPedidoProveedor = 1;
        if (lastOrderResult.recordset[0].UltimoNumero) {
          numeroPedidoProveedor = lastOrderResult.recordset[0].UltimoNumero + 1;
        }

        await transaction.request()
          .input('CodigoEmpresa', order.CodigoEmpresa)
          .input('EjercicioPedido', order.EjercicioPedido)
          .input('SeriePedido', 'Web')
          .input('NumeroPedido', numeroPedidoProveedor)
          .input('CodigoProveedor', supplierCode)
          .input('RazonSocial', order.RazonSocial)
          .input('Domicilio', order.Domicilio)
          .input('CodigoPostal', order.CodigoPostal)
          .input('Municipio', order.Municipio)
          .input('Provincia', order.Provincia)
          .input('Nacion', order.Nacion)
          .input('StatusAprobado', -1)
          .query(`
            INSERT INTO CabeceraPedidoProveedor (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido,
              CodigoProveedor, RazonSocial, Domicilio, CodigoPostal,
              Municipio, Provincia, Nacion, StatusAprobado
            ) VALUES (
              @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido,
              @CodigoProveedor, @RazonSocial, @Domicilio, @CodigoPostal,
              @Municipio, @Provincia, @Nacion, @StatusAprobado
            )
          `);

        for (const [index, item] of items.entries()) {
          await transaction.request()
            .input('CodigoEmpresa', order.CodigoEmpresa)
            .input('EjercicioPedido', order.EjercicioPedido)
            .input('SeriePedido', 'Web')
            .input('NumeroPedido', numeroPedidoProveedor)
            .input('Orden', index + 1)
            .input('CodigoArticulo', item.CodigoArticulo)
            .input('DescripcionArticulo', item.DescripcionArticulo)
            .input('UnidadesPedidas', item.UnidadesPedidas)
            .input('Precio', item.Precio)
            .query(`
              INSERT INTO LineasPedidoProveedor (
                CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
                CodigoArticulo, DescripcionArticulo, UnidadesPedidas, Precio
              ) VALUES (
                @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @Orden,
                @CodigoArticulo, @DescripcionArticulo, @UnidadesPedidas, @Precio
              )
            `);
        }

        await transaction.request()
          .input('sysGrupo', order.CodigoEmpresa)
          .input('sysContadorValor', numeroPedidoProveedor)
          .query(`
            UPDATE LSYSCONTADORES 
            SET sysContadorValor = @sysContadorValor
            WHERE sysGrupo = @sysGrupo
            AND sysNombreContador = 'PEDIDOS_PRO'
          `);
      }

      await transaction.request()
        .input('NumeroPedido', orderId)
        .query(`
          UPDATE CabeceraPedidoCliente
          SET StatusAprobado = -1
          WHERE NumeroPedido = @NumeroPedido
        `);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: 'Pedido aprobado y pedidos de compra generados correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción:', err);
      throw new Error(`Error en la transacción: ${err.message}`);
    }
  } catch (error) {
    console.error('Error al aprobar pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al aprobar el pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPendingOrders,
  getOrderForReview,
  approveOrder
};