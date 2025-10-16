const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Servidor funcionando!',
    timestamp: new Date().toISOString(),
    clientIP: req.ip,
    headers: req.headers
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔍 Servidor de prueba en http://0.0.0.0:${PORT}`);
});