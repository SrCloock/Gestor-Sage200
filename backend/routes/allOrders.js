const express = require('express');
const router = express.Router();
const { 
  getAllOrders, 
  getOrderDetails,
  getAdminOrderDetails 
} = require('../controllers/allOrdersController');

// Ruta para obtener todos los pedidos con filtros
router.get('/', getAllOrders);

// Ruta para detalles de pedidos específicos (para usuarios normales)
router.get('/:orderId', getOrderDetails);

// Ruta específica para detalles de pedidos en panel de administración
router.get('/:orderId/admin-details', getAdminOrderDetails);

module.exports = router;