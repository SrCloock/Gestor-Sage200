const express = require('express');
const router = express.Router();

router.post('/upload', (req, res) => {
  res.json({ message: 'Imagen subida correctamente' });
});

module.exports = router;
