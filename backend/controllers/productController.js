// Archivo: productController.js
const Product = require('../models/Product');

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.getAll();
    res.json(products);
  } catch (err) {
    res.status(500).send('Error al obtener productos');
  }
};