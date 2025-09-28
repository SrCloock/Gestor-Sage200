// routes/allOrders.js
const express = require('express');
const router = express.Router();
const allOrdersController = require('../controllers/allOrdersController');
const { adminAuth } = require('../middleware/auth');

// Ruta para obtener todos los pedidos con filtros
router.get('/', adminAuth, allOrdersController.getAllOrders);

// Ruta para obtener detalles de un pedido específico
router.get('/:orderId', adminAuth, allOrdersController.getOrderDetails);

module.exports = router;