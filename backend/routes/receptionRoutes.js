const express = require('express');
const router = express.Router();
const {
  getOrderReception,
  confirmReception,
  finalizeOrder 
} = require('../controllers/receptionController');


console.log('✅ receptionRoutes cargado - SIN validación de autenticación temporalmente');

// Rutas 
router.get('/:orderId', getOrderReception);
router.post('/:orderId/confirm', confirmReception);
router.post('/:orderId/finalize', finalizeOrder); 

module.exports = router;