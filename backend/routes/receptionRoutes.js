const express = require('express');
const router = express.Router();
const {
  getOrderReception,
  confirmReception
} = require('../controllers/receptionController');

router.get('/:orderId', getOrderReception);
router.post('/:orderId/confirm', confirmReception);

module.exports = router;