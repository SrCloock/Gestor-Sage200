// routes/allOrders.js
const express = require('express');
const router = express.Router();
const allOrdersController = require('../controllers/allOrdersController');
const { adminAuth } = require('../middleware/auth');

// Todas las rutas requieren autenticación de administrador
router.get('/', adminAuth, allOrdersController.getAllOrders);
router.get('/:orderId', adminAuth, allOrdersController.getOrderDetails);

module.exports = router;