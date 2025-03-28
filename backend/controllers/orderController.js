const { sage200Pool } = require('../config/sage200db');
const { pool: mysqlPool } = require('../config/localDb');

exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    
    // 1. Registrar en MySQL (historial)
    const [mysqlResult] = await mysqlPool.query(
      'INSERT INTO orders (user_id, total, date) VALUES (?, ?, NOW())',
      [req.user?.id || 1, items.reduce((sum, item) => sum + item.Precio, 0)]
    );

    // 2. Registrar en Sage200 (opcional)
    // Aquí iría la lógica para crear el pedido en Sage200

    res.json({
      success: true,
      orderId: mysqlResult.insertId
    });
  } catch (err) {
    console.error('Error al crear pedido:', err);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const [orders] = await mysqlPool.query(
      'SELECT * FROM orders WHERE user_id = ?',
      [req.user?.id || 1]
    );
    res.json(orders);
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};