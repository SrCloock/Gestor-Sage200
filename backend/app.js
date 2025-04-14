const express = require('express');
const { connect } = require('./config/sage200db');
const app = express();

// Middlewares
app.use(express.json());

// Conexión a la base de datos
connect();

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/products', require('./routes/products'));

// Manejo de errores
app.use(require('./middlewares/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});