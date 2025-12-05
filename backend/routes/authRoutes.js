const express = require('express');
const router = express.Router();
const { 
  login, 
  logout, 
  checkSession, 
  getUserFromSession,
  getSessionStatus 
} = require('../controllers/authController');

router.post('/login', login); 
router.post('/logout', logout);
router.get('/status', getSessionStatus); // Para verificar sesión desde frontend
router.get('/check', checkSession); // Para verificar autenticación

module.exports = router;