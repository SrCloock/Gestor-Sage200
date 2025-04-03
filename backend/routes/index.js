const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/localDb');

// Configuración de Multer para guardar imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Endpoint para subir imágenes
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const imagePath = `/uploads/${req.file.filename}`;
    // Guardar en MySQL
    await pool.query(
      'INSERT INTO product_images (product_id, image_path) VALUES (?, ?)',
      [req.body.productId || null, imagePath]
    );
    res.json({ url: imagePath });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
});

module.exports = router;