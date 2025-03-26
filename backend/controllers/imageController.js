// Archivo: imageController.js
const multer = require('multer');
const path = require('path');
const localPool = require('../config/localDb');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.productId}${ext}`);
  }
});

const upload = multer({ storage }).single('image');

exports.uploadImage = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).send(err.message);
    
    await localPool.execute(
      'INSERT INTO product_images (product_id, path) VALUES (?, ?)',
      [req.params.productId, req.file.filename]
    );
    
    res.status(201).send('Imagen subida');
  });
};