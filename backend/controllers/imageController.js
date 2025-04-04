const { pool } = require('../config/localDb');
const fs = require('fs');
const path = require('path');

exports.uploadImage = async (req, res) => {
  const { productId } = req.body;
  const imagePath = req.file.path;

  try {
    await pool.query(
      'INSERT INTO product_images (product_id, image_path) VALUES (?, ?)',
      [productId, imagePath]
    );
    res.status(201).json({ success: true, imagePath });
  } catch (err) {
    fs.unlinkSync(imagePath); // Borra el archivo si hay error
    res.status(500).json({ error: 'Error al guardar la imagen' });
  }
};

exports.getImages = async (req, res) => {
  try {
    const [images] = await pool.query('SELECT * FROM product_images');
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
};