const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const pedidosRoutes = require('./routes/pedidos');
const articulosRoutes = require('./routes/articulos');
const { connect } = require('./config/sage200db');

const app = express();

// Configuración básica
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Conectar a la base de datos al iniciar
connect().catch(err => {
  console.error('No se pudo conectar a la base de datos:', err);
  process.exit(1);
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/articulos', articulosRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});