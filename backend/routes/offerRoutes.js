const express = require('express');
const router = express.Router();
const { createOffer } = require('../controllers/offerController');

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

router.post('/', createOffer);

module.exports = router;