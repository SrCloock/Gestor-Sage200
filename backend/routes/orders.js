const express = require('express');
const orderController = require('../controllers/orderController');
const router = express.Router();

router.post('/', orderController.createOrder);
router.get('/:CodigoCliente', orderController.getOrderHistory);

module.exports = router;