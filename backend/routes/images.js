const express = require('express');
const multer = require('multer');
const { uploadImage, getImages } = require('../controllers/imageController');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('image'), uploadImage);
router.get('/', getImages);

module.exports = router;