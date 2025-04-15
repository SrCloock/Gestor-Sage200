const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController'); // Asegúrate que esta ruta es correcta

router.post('/login', login); // Ahora sí recibe la función login

module.exports = router;