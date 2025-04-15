const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

router.get('/historial', pedidosController.obtenerHistorial);
router.get('/detalles', pedidosController.obtenerDetalles);

module.exports = router;
