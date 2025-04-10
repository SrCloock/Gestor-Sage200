const { ConnectionPool } = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.SAGE200_SERVER,
  database: process.env.SAGE200_DATABASE,
  user: process.env.SAGE200_USER,
  password: process.env.SAGE200_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    appName: 'GestorComprasWeb',
    connectTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }
};

const pool = new ConnectionPool(config);
let connected = false;

pool.on('error', err => {
  console.error('❌ Error permanente en el pool:', err);
});

const connect = async () => {
  if (!connected) {
    try {
      await pool.connect();
      connected = true;
      console.log('✅ Conexión a Sage200 establecida');
    } catch (err) {
      console.error('❌ Fallo de conexión a Sage200:', {
        message: err.message,
        server: config.server,
        database: config.database,
        user: config.user,
        suggestion: 'Verifique: 1) Sage200 en ejecución 2) Usuario/contraseña 3) Servidor accesible'
      });
      throw err;
    }
  }
  return pool;
};

const getPool = () => {
  if (!connected) throw new Error('❌ Conexión no inicializada. Ejecuta connect() primero.');
  return pool;
};

module.exports = { connect, getPool };