const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/imageController');

router.post('/upload/:productId', uploadImage);

module.exports = router;