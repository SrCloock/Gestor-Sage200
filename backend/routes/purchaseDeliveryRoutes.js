const express = require('express');
const router = express.Router();
const {
  procesarRecepcionYGenerarAlbaranes,
  getAlbaranesCompraPorPedido
} = require('../controllers/purchaseDeliveryController');

// Ruta para procesar recepción y generar albaranes de compra
router.post('/:orderId/process-reception', procesarRecepcionYGenerarAlbaranes);

// Ruta para obtener albaranes de compra por pedido
router.get('/:orderId/albaranes-compra', getAlbaranesCompraPorPedido);

module.exports = router;