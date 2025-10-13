const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/catalog');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const receptionRoutes = require('./routes/receptionRoutes');
const allOrdersRoutes = require('./routes/allOrders');
const catalogRoutes = require('./routes/catalog');

const { connect } = require('./db/Sage200db');
const { syncImagesWithDB } = require('./controllers/catalogController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir imágenes
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// CONFIGURACIÓN CORS PARA PRODUCCIÓN
const corsOptions = {
  origin: function (origin, callback) {
    // En producción, permitir cualquier origen
    if (process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      // En desarrollo, mantener los orígenes locales
      const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000'];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Preflight para todas las rutas
app.options('*', cors(corsOptions));

// Headers manuales mejorados
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:3000');
  }
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conectar a la base de datos
connect().then(async () => {
  console.log('✅ Base de datos conectada');
}).catch(err => {
  console.error('❌ Error al conectar a la base de datos:', err);
});

// RUTAS API - TODAS CON /api
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/all-orders', allOrdersRoutes);
app.use('/api/catalog', catalogRoutes);

// Ruta de salud mejorada
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'API Sage200 Gestor - Servidor funcionando',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Middleware de errores mejorado
app.use((err, req, res, next) => {
  console.error('Error del servidor:', err.stack);
  
  // Errores de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor en todas las interfaces
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 API Base: http://${HOST}:${PORT}/api`);
  console.log(`🔍 Health Check: http://${HOST}:${PORT}/api/health`);
});