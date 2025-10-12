const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/catalog');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const receptionRoutes = require('./routes/receptionRoutes');
const allOrdersRoutes = require('./routes/allOrders');
const catalogRoutes = require('./routes/catalog'); // NUEVA RUTA DEL CATÁLOGO

const { connect } = require('./db/Sage200db');
const { syncImagesWithDB } = require('./controllers/catalogController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir imágenes
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Configuración CORS detallada
const allowedOrigins = ['http://localhost:3000','http://localhost:3001','http://localhost:4000'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Preflight
app.options('*', cors(corsOptions));

// Headers manuales
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a la base de datos y sincronizar imágenes
connect().then(async () => {
  console.log('✅ Base de datos conectada');
}).catch(err => {
  console.error('❌ Error al conectar a la base de datos:', err);
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/all-orders', allOrdersRoutes);
app.use('/api/catalog', catalogRoutes); // NUEVA RUTA DEL CATÁLOGO

// Ruta de salud para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Middleware de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📦 Ruta del catálogo: http://localhost:${PORT}/api/catalog`);
});