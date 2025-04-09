const express = require('express');
const { login } = require('../controllers/authController');  // Solo mantén la importación de login

const router = express.Router();

// Ruta para login de usuario normal
router.post('/login', login);

// (Opcional) Ruta para login de administrador (si decides implementarlo)
router.post('/admin-login', (req, res) => {
  res.status(400).json({ message: 'Funcionalidad de login de administrador aún no implementada.' });
});

module.exports = router;
