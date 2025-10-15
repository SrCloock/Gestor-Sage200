const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session'); // ← AÑADE ESTA IMPORTACIÓN

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/catalog');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const receptionRoutes = require('./routes/receptionRoutes');
const allOrdersRoutes = require('./routes/allOrders');
const catalogRoutes = require('./routes/catalog');

const { connect } = require('./db/Sage200db');

const app = express();
const PORT = process.env.PORT || 3001;

// =========================
// MIDDLEWARE DE SESIÓN (CRÍTICO PARA EL LOGIN)
// =========================
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu-clave-secreta-muy-segura-aqui-12345',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Cambiar a true en producción con HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    httpOnly: true
  }
}));

// Middleware para servir imágenes
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// =========================
// CORS dinámico para desarrollo y producción
// =========================
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    // Permitir ngrok
    if (origin.startsWith('https://') && origin.includes('ngrok-free.app')) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://localhost:4000',
      'http://80.24.244.68:3000',
      'http://80.24.244.68',
      'http://217.18.162.30:3000',
      'http://217.18.162.30',
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'usuario', 'codigoempresa']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Headers manuales para mayor compatibilidad
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('localhost') || origin.includes('ngrok-free.app'))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, usuario, codigoempresa');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
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
// CONFIGURACIÓN DUAL: Frontend estático y desarrollo
// =========================

// 1. Intentar servir desde build del backend (producción)
const backendBuildPath = path.join(__dirname, 'build');
// 2. Intentar servir desde build del frontend (desarrollo)
const frontendBuildPath = path.join(__dirname, '../frontend/build');

let staticPath = null;

if (fs.existsSync(backendBuildPath)) {
  staticPath = backendBuildPath;
  console.log('✅ Sirviendo frontend desde build del backend:', backendBuildPath);
} else if (fs.existsSync(frontendBuildPath)) {
  staticPath = frontendBuildPath;
  console.log('✅ Sirviendo frontend desde build del frontend:', frontendBuildPath);
} else {
  console.warn('⚠️ No se encontró carpeta build. Ejecutando solo API.');
}

if (staticPath) {
  app.use(express.static(staticPath));

  // Todas las rutas que no son API van al frontend
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
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
  res.status(404).json({ 
    success: false, 
    message: `Ruta API no encontrada: ${req.originalUrl}`,
    timestamp: new Date().toISOString() 
  });
});

// =========================
// INICIAR SERVIDOR
// =========================
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`📦 API Base: http://${HOST}:${PORT}/api`);
  console.log(`🔍 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Sesiones habilitadas: SÍ`);
  if (staticPath) {
    console.log(`📁 Frontend servido desde: ${staticPath}`);
  }
});