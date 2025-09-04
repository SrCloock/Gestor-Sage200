const express = require('express');
const router = express.Router();
const {
  getPendingOrders,
  getOrderForReview,
  approveOrder
} = require('../controllers/adminController');

router.get('/orders/pending', getPendingOrders);
router.get('/orders/:orderId', getOrderForReview);
router.post('/orders/:orderId/approve', approveOrder);

module.exports = router;