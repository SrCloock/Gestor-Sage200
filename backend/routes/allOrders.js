// routes/allOrders.js
const express = require('express');
const router = express.Router();
const allOrdersController = require('../controllers/allOrdersController');

// Ruta para obtener todos los pedidos con filtros
router.get('/', allOrdersController.getAllOrders);

// Ruta para obtener detalles de un pedido específico
router.get('/:orderId', allOrdersController.getOrderDetails);

module.exports = router;