const express = require('express');
const router = express.Router();

const { 
  createOrder, 
  getOrders, 
  getOrderDetails,
  updateOrder 
} = require('../controllers/orderController');

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:numeroPedido', getOrderDetails);
router.put('/:orderId', updateOrder);

module.exports = router;
