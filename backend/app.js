const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/catalog');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const receptionRoutes = require('./routes/receptionRoutes');
const allOrdersRoutes = require('./routes/allOrders');
const catalogRoutes = require('./routes/catalog');

const { connect } = require('./db/Sage200db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir imágenes
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// =========================
// CORS dinámico para Ngrok, localhost y IP pública
// =========================
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('https://') && origin.includes('ngrok-free.app')) {
      return callback(null, true);
    }
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
      'http://80.24.244.68:3000',
      'http://80.24.244.68',
      'http://217.18.162.30:3000',
      'http://217.18.162.30',
    ];
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'usuario', 'codigoempresa']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Headers manuales
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, usuario, codigoempresa');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conexión a la base de datos
connect().then(() => {
  console.log('✅ Base de datos conectada');
}).catch(err => {
  console.error('❌ Error al conectar a la base de datos:', err);
});

// =========================
// RUTAS API
// =========================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/all-orders', allOrdersRoutes);
app.use('/api/catalog', catalogRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =========================
// SERVIR FRONTEND ESTÁTICO
// =========================
const staticPath = path.join(__dirname, 'build');

if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));

  // Cualquier ruta que no sea /api/* va al frontend
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  console.log('✅ Frontend estático servido desde:', staticPath);
} else {
  console.warn('⚠️ No se encontró carpeta build en:', staticPath);
}

// =========================
// Middleware de errores
// =========================
app.use((err, req, res, next) => {
  console.error('Error del servidor:', err.stack);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origen no permitido por CORS' });
  }
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// =========================
// Rutas API no encontradas
// =========================
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Ruta API no encontrada: ${req.originalUrl}`, timestamp: new Date().toISOString() });
});

// =========================
// INICIAR SERVIDOR
// =========================
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`📦 API Base: http://${HOST}:${PORT}/api`);
  console.log(`🔍 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`🌐 Puedes usar Ngrok con cualquier URL generada`);
});
