// Archivo: orderController.js
const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    const { userId, items } = req.body;
    
    // Validar stock antes de crear
    const stockCheck = await checkStock(items);
    if (!stockCheck.available) {
      return res.status(400).json({ 
        error: `Stock insuficiente para ${stockCheck.product}` 
      });
    }

    const orderId = await Order.create(userId, items);
    res.status(201).json({ orderId });
  } catch (err) {
    res.status(500).send('Error al crear pedido');
  }
};

async function checkStock(items) {
  // Lógica de validación con Sage200
}