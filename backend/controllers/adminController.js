const { getPool } = require('../db/Sage200db');

// Lista de usuarios administradores (configura según tus necesidades)
const adminUsers = ['admin', 'useradmin'];

const getPendingOrders = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        c.NumeroPedido,
        c.FechaPedido,
        c.RazonSocial,
        c.CifDni,
        c.NumeroLineas,
        c.StatusAprobado,
        c.SeriePedido,
        c.BaseImponible,
        u.UsuarioLogicNet as UsuarioCliente
      FROM CabeceraPedidoCliente c
      JOIN CLIENTES u ON c.CodigoCliente = u.CodigoCliente
      WHERE c.StatusAprobado = 0
      ORDER BY c.FechaPedido DESC
    `);

    res.status(200).json({
      success: true,
      orders: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener pedidos pendientes' 
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
      message: 'Error al obtener el pedido' 
    });
  }
};

const approveOrder = async (req, res) => {
  const { orderId } = req.params;
  const { modifiedItems } = req.body;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Actualizar cantidades si se modificaron
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

      // 2. Obtener información del pedido actualizado
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

      // 3. Agrupar artículos por proveedor
      const itemsBySupplier = {};
      orderResult.recordset.forEach(item => {
        const supplier = item.CodigoProveedor;
        if (!itemsBySupplier[supplier]) {
          itemsBySupplier[supplier] = [];
        }
        itemsBySupplier[supplier].push(item);
      });

      // 4. Crear pedidos de compra para cada proveedor
      for (const [supplierCode, items] of Object.entries(itemsBySupplier)) {
        // Obtener el último número de pedido de proveedor
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

        // Crear cabecera de pedido de proveedor
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

        // Crear líneas de pedido de proveedor
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

        // Actualizar contador de pedidos de proveedor
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

      // 5. Marcar pedido como aprobado
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
      throw err;
    }
  } catch (error) {
    console.error('Error al aprobar pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al aprobar el pedido' 
    });
  }
};

module.exports = {
  getPendingOrders,
  getOrderForReview,
  approveOrder
};