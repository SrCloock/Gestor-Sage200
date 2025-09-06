const express = require('express');
const router = express.Router();
const {
  getPendingOrders,
  getOrderForReview,
  updateOrderQuantitiesAndApprove
} = require('../controllers/adminController');

router.get('/orders/pending', getPendingOrders);
router.get('/orders/:orderId', getOrderForReview);
router.put('/orders/:orderId/approve', updateOrderQuantitiesAndApprove);

module.exports = router;