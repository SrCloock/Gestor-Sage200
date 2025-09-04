const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const supplierOrderController = require('./routes/orderSupplierRoutes');
const offerRoutes = require('./routes/offerRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { connect } = require('./db/Sage200db');
const { syncImagesWithDB } = require('./controllers/productController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware para servir imágenes
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Configuración CORS detallada
const allowedOrigins = ['http://localhost:3000'];

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
  res.header('Access-Control-Allow-Headers', 'Content-Type', 'Authorization');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a la base de datos y sincronizar imágenes
connect().then(async () => {
  console.log('✅ Base de datos conectada');
  await syncImagesWithDB();
}).catch(err => {
  console.error('❌ Error al conectar a la base de datos:', err);
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/supplier-orders', supplierOrderController);
app.use('/api/offers', offerRoutes);
app.use('/api/admin', adminRoutes);

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
});