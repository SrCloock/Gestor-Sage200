const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getOrders, 
  getOrderDetails,
  updateOrder 
} = require('../controllers/orderController');

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:numeroPedido', getOrderDetails);
router.put('/:orderId', updateOrder);

module.exports = router;