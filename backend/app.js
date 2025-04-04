require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connect } = require('./config/sage200db');
const mainRouter = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

// ======================
// 1. VERIFICACIÓN INICIAL
// ======================
console.log('\n🔧 ===== INICIANDO SERVIDOR ===== 🔧');
console.log('🔍 Verificando variables de entorno...');

const requiredEnvVars = [
  'SAGE200_SERVER',
  'SAGE200_DATABASE', 
  'SAGE200_USER',
  'SAGE200_PASSWORD',
  'MYSQL_HOST'
];

let allVarsPresent = true;
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Variable de entorno faltante: ${envVar}`);
    allVarsPresent = false;
  } else {
    console.log(`   ✔ ${envVar}: ${envVar.includes('PASSWORD') ? '*****' : process.env[envVar]}`);
  }
});

if (!allVarsPresent) {
  console.error('\n⚠️  Faltan variables esenciales. El servidor no puede iniciar.');
  process.exit(1);
}

// ======================
// 2. CONEXIÓN A BASES DE DATOS
// ======================
console.log('\n🔌 Probando conexiones a bases de datos...');

connect().then(async sageConnected => {
  if (!sageConnected) {
    console.error('⚠️  AVISO: Sage200 no está disponible (el servidor iniciará igual)');
  }

  const mysqlStatus = { connected: false, message: '' };
  if (process.env.USE_MYSQL === 'true') {
    try {
      const mysqlPool = require('./config/localDb').pool;
      await mysqlPool.getConnection();
      mysqlStatus.connected = true;
      mysqlStatus.message = '✅ MySQL: Conexión exitosa';
    } catch (mysqlErr) {
      mysqlStatus.message = `⚠️  AVISO: Error de conexión a MySQL - ${mysqlErr.message}`;
    }
  } else {
    mysqlStatus.message = '⚠️  Conexión a MySQL deshabilitada por configuración.';
  }
  console.log(mysqlStatus.message);

  // ======================
  // 3. INICIO DE EXPRESS
  // ======================
  const app = express();

  // Configuración básica
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOADS_DIR)));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/images', require('./routes/images'));
  app.use('/api/auth', require('./routes/auth'));
  
  // Logger de requests mejorado
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Rutas principales
  app.use('/api', mainRouter);

  // Health Check mejorado
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      sage200: sageConnected ? 'CONNECTED' : 'DISCONNECTED',
      mysql: mysqlStatus.connected ? 'CONNECTED' : 'DISCONNECTED',
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    });
  });

  // Manejo de errores centralizado
  app.use(notFound);
  app.use(errorHandler);

  // Inicio del servidor
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log('\n🚀 ===== SERVIDOR INICIADO ===== 🚀');
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Modo: ${process.env.NODE_ENV}`);
    console.log(`   Sage200: ${sageConnected ? '✅ CONECTADO' : '❌ DESCONECTADO'}`);
    console.log(`   MySQL: ${mysqlStatus.connected ? '✅ CONECTADO' : '❌ DESCONECTADO'}`);
    console.log(`   Cache: ✅ ACTIVADO (TTL: ${process.env.CACHE_TTL}s)\n`);
  });
});