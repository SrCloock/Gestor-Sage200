// routes/catalog.js
const express = require('express');
const router = express.Router();
const { getCatalogProducts, getProductFilters } = require('../controllers/catalogController');

router.get('/products', getCatalogProducts);
router.get('/filters', getProductFilters);

module.exports = router;