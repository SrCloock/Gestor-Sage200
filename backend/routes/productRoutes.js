const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getProducts);
router.get('/paginated', productController.getProductsPaginated);
router.delete('/cache', productController.clearCache);

module.exports = router;