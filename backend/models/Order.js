// Archivo: Order.js
const { sage200Pool, localPool } = require('../config/index.js');

class Order {
  static async create(userId, items) {
    // 1. Crear en Sage200
    const { recordset } = await sage200Pool.request()
      .input('userId', userId)
      .query(`
        INSERT INTO CabeceraPedido (UsuarioId, Fecha) 
        OUTPUT INSERTED.Id
        VALUES (@userId, GETDATE())
      `);
    
    // 2. Guardar en MySQL
    await localPool.execute(
      'INSERT INTO orders (sage_id, user_id) VALUES (?, ?)',
      [recordset[0].Id, userId]
    );
    
    return recordset[0].Id;
  }
}

module.exports = Order;