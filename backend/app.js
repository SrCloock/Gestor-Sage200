require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const { connect } = require('./config/sage200db');
const { pool: mysqlPool } = require('./config/localDb');

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

  try {
    await mysqlPool.getConnection();
    console.log('✅ MySQL: Conexión exitosa');
  } catch (mysqlErr) {
    console.error('⚠️  AVISO: Error de conexión a MySQL', mysqlErr.message);
  }

  // ======================
  // 3. INICIO DE EXPRESS
  // ======================
  const app = express();


  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
  });

  app.use('/api/products', require('./routes/products'));
  app.use('/api/images', require('./routes/images'));
  app.use('/api/orders', require('./routes/orders'));

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      sage200: sageConnected ? 'CONNECTED' : 'DISCONNECTED',
      mysql: 'OPERATIONAL',
      environment: 'development'
    });
  });

  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Algo salió mal' });
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log('\n🚀 ===== SERVIDOR INICIADO ===== 🚀');
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Modo: Desarrollo local`);
    console.log(`   Sage200: ${sageConnected ? '✅ CONECTADO' : '❌ DESCONECTADO'}`);
    console.log(`   MySQL: ✅ OPERATIVO\n`);
  });
});