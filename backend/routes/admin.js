const express = require('express');
const router = express.Router();

// Ruta de login hardcodeado
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '1234') {
    res.json({ success: true, token: 'fake-admin-token' });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

module.exports = router;