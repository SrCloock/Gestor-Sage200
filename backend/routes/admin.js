const express = require('express');
const router = express.Router();
const pool = require('../config/localDb');

// Obtener todas las imágenes subidas
router.get('/images', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM product_images');
  res.json(rows);
});

module.exports = router;