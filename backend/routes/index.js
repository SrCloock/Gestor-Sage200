const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/products', require('./products'));
router.use('/orders', require('./orders'));
router.use('/admin', require('./admin'));
router.use('/images', require('./images'));

module.exports = router;
