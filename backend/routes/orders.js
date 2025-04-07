const express = require('express');
const { getProducts, getProductById } = require('../controllers/productController');
const { insertOrder } = require('../controllers/orderController');

const router = express.Router();
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', insertOrder);

module.exports = router;
