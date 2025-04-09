const { sage200Pool, localPool } = require('../config/index.js');

class Order {
  static async create(userId, items) {
    try {
      // 1. Obtener los datos del usuario (CodigoEmpresa y RazonSocial) usando el CodigoCliente
      const { recordset: userRecord } = await sage200Pool.request()
        .input('userId', userId)
        .query(`
          SELECT CodigoEmpresa, RazonSocial 
          FROM CLIENTES 
          WHERE CodigoCliente = @userId
        `);

      if (userRecord.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const { CodigoEmpresa, RazonSocial } = userRecord[0];

      // 2. Generar los valores de EjercicioPedido y SeriePedido automáticamente
      const EjercicioPedido = new Date().getFullYear();  // Año actual como EjercicioPedido
      const SeriePedido = 'A';  // Aquí podrías definir la serie que necesites, por ahora es fija a 'A'

      // 3. Obtener el siguiente NumeroPedido autoincremental por CodigoEmpresa
      const { recordset: orderRecord } = await sage200Pool.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .query(`
          SELECT MAX(NumeroPedido) AS MaxNumeroPedido
          FROM CabeceraPedido
          WHERE CodigoEmpresa = @CodigoEmpresa
        `);
      
      const nuevoNumeroPedido = orderRecord[0].MaxNumeroPedido ? orderRecord[0].MaxNumeroPedido + 1 : 1;

      // 4. Crear en la tabla CabeceraPedido (Sage200) con los datos generados
      const { recordset } = await sage200Pool.request()
        .input('CodigoEmpresa', CodigoEmpresa)
        .input('EjercicioPedido', EjercicioPedido)
        .input('SeriePedido', SeriePedido)
        .input('NumeroPedido', nuevoNumeroPedido)
        .input('RazonSocial', RazonSocial)
        .input('Fecha', new Date())
        .query(`
          INSERT INTO CabeceraPedido (CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, RazonSocial, Fecha) 
          OUTPUT INSERTED.Id
          VALUES (@CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @RazonSocial, @Fecha)
        `);

      const cabeceraPedidoId = recordset[0].Id;

      // 5. Insertar las líneas del pedido (Artículos) en la tabla LineasPedidoCliente
      for (let item of items) {
        await sage200Pool.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', SeriePedido)
          .input('NumeroPedido', nuevoNumeroPedido)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('Cantidad', item.Cantidad)
          .query(`
            INSERT INTO LineasPedidoCliente (CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, CodigoArticulo, Cantidad) 
            VALUES (@CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @CodigoArticulo, @Cantidad)
          `);
      }

      // 6. Guardar en la base de datos local (MySQL)
      await localPool.execute(
        'INSERT INTO orders (sage_id, user_id, CodigoEmpresa, NumeroPedido) VALUES (?, ?, ?, ?)',
        [cabeceraPedidoId, userId, CodigoEmpresa, nuevoNumeroPedido]
      );
      
      return { 
        sageId: cabeceraPedidoId, 
        CodigoEmpresa, 
        NumeroPedido: nuevoNumeroPedido 
      };
    } catch (error) {
      console.error('Error al crear el pedido:', error.message);
      throw new Error('Error al crear el pedido');
    }
  }
}

module.exports = Order;
