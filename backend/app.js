const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const supplierOrderController = require('./routes/orderSupplierRoutes');
const { getPool, connect, close } = require('./db/Sage200db');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Configuración CORS
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
app.options('*', cors(corsOptions));

// Middleware para headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Conectar a la base de datos e inicializar imágenes
let dbConnected = false;

const initializeImagePaths = async () => {
  const pool = await getPool();
  const imagesDir = path.join(__dirname, 'public', 'images');
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('📁 Carpeta de imágenes creada');
    return;
  }

  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file) && file !== 'default-product.jpg');

  console.log(`🖼️ Encontradas ${imageFiles.length} imágenes para registrar`);

  for (const file of imageFiles) {
    const codigoArticulo = path.parse(file).name;
    
    try {
      const updateResult = await pool.request()
        .input('codigo', codigoArticulo)
        .input('ruta', file)
        .query(`
          UPDATE Articulos 
          SET RutaImagen = @ruta 
          WHERE CodigoArticulo = @codigo
          AND (RutaImagen IS NULL OR RutaImagen != @ruta)
        `);

      if (updateResult.rowsAffected[0] > 0) {
        console.log(`✅ Imagen registrada: ${file} → Artículo ${codigoArticulo}`);
      }
    } catch (error) {
      console.error(`❌ Error al registrar ${file}:`, error.message);
    }
  }
};

connect()
  .then(async () => {
    dbConnected = true;
    console.log('✅ Base de datos conectada');
    
    try {
      await initializeImagePaths();
      console.log('🔄 Migración de imágenes completada');
    } catch (err) {
      console.error('⚠️ Error en migración de imágenes:', err.message);
    }
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos:', err);
    process.exit(1);
  });

// Health Check
app.get('/health', (req, res) => {
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'OK' : 'ERROR',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString()
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/supplier-orders', supplierOrderController);

// Endpoint para refrescar imágenes manualmente
app.get('/api/refresh-images', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ success: false, error: 'Database not connected' });
  }

  try {
    await initializeImagePaths();
    res.json({ success: true, message: 'Rutas de imágenes actualizadas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Cierre limpio
const gracefulShutdown = () => {
  console.log('\n🛑 Recibida señal de apagado...');
  
  server.close(async () => {
    console.log('🔴 Servidor detenido');
    
    try {
      await close();
      console.log('🔌 Conexión a BD cerrada');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error al cerrar conexión a BD:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('⌛ Forzando cierre por timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

module.exports = { app, server };