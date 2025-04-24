const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrderDetails } = require('../controllers/orderController');

// Configurar CORS para todas las rutas de orders
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Rutas
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:numeroPedido', getOrderDetails);

module.exports = router;