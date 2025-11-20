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
const purchaseDeliveryRoutes = require('./routes/purchaseDeliveryRoutes');

const { connect } = require('./db/Sage200db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir imágenes
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// =========================
// CORS COMPLETAMENTE PERMISIVO TEMPORALMENTE
// =========================
app.use(cors({
  origin: function (origin, callback) {
    // 🔥 PERMITIR TODOS LOS ORÍGENES TEMPORALMENTE
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'usuario', 'codigoempresa', 'Accept', '*'],
  exposedHeaders: ['Content-Length', 'X-Total-Count']
}));

// Headers manuales MEJORADOS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // 🔥 PERMITIR CUALQUIER ORIGEN
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, usuario, codigoempresa, Accept, Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count');
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🛬 Preflight request recibida para:', req.path, 'desde:', origin);
    return res.status(200).end();
  }
  
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${origin}`);
  next();
});

// Parseo JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conexión a la base de datos
connect()
  .then(() => console.log('✅ Base de datos conectada'))
  .catch(err => console.error('❌ Error al conectar a la base de datos:', err));

// =========================
// RUTAS API
// =========================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/all-orders', allOrdersRoutes);
app.use('/api/purchase-delivery', purchaseDeliveryRoutes);
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
  console.error('❌ Error del servidor:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      success: false, 
      message: 'Origen no permitido por CORS',
      allowedOrigins: ['http://localhost:3001', 'http://localhost:3000', 'http://217.18.162.40:3000', 'http://217.18.162.40:3001'],
      receivedOrigin: req.headers.origin
    });
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
  console.log(`❌ Ruta API no encontrada: ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `Ruta API no encontrada: ${req.originalUrl}`, 
    timestamp: new Date().toISOString() 
  });
});

// =========================
// INICIAR SERVIDOR
// =========================
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`📦 API Base: http://${HOST}:${PORT}/api`);
  console.log(`🔍 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔐 CORS configurado para PERMITIR TODOS LOS ORÍGENES`);
  console.log(`⚠️  ADVERTENCIA: Esta configuración es solo para desarrollo`);
});