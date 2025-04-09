const express = require('express');
const { 
  getProducts, 
  getProductById 
} = require('../controllers/productController');

const router = express.Router();

// Obtener todos los productos o filtrados según query
router.get('/', getProducts);

// Obtener producto por ID
router.get('/:id', getProductById);

module.exports = router;
