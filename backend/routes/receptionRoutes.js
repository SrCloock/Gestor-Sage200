const express = require('express');
const router = express.Router();
const {
  getOrderReception,
  confirmReception
} = require('../controllers/receptionController');

// 🔥 ELIMINADO TEMPORALMENTE: Middleware de autenticación
// Para debugging, eliminamos completamente la validación de headers
// const authenticateUser = (req, res, next) => {
//   const usuario = req.headers.usuario;
//   const codigoempresa = req.headers.codigoempresa;
  
//   console.log('🔐 Headers recibidos:', {
//     usuario: usuario,
//     codigoempresa: codigoempresa,
//     path: req.path,
//     method: req.method
//   });

//   // Temporalmente sin validación para testing
//   next();
// };

// 🔥 COMENTADO TEMPORALMENTE: Aplicar middleware
// router.use(authenticateUser);

// Rutas - SIN AUTENTICACIÓN TEMPORALMENTE
router.get('/:orderId', getOrderReception);
router.post('/:orderId/confirm', confirmReception);

console.log('✅ receptionRoutes cargado - SIN validación de autenticación temporalmente');

module.exports = router;