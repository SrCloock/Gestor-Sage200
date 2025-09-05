const express = require('express');
const router = express.Router();
const {
  getPendingOrders,
  getOrderForReview
} = require('../controllers/adminController');

router.get('/orders/pending', getPendingOrders);
router.get('/orders/:orderId', getOrderForReview);

module.exports = router;