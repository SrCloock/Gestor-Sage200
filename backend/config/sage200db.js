const { ConnectionPool } = require('mssql');
const logger = require('../utils/logger');

const config = {
  server: process.env.SAGE200_SERVER,
  database: process.env.SAGE200_DATABASE,
  user: process.env.SAGE200_USER,
  password: process.env.SAGE200_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    appName: 'GestorComprasWeb',
    connectTimeout: 30000,
  },
};

const pool = new ConnectionPool(config);
let connected = false;

pool.on('error', err => {
  logger.error('❌ Error en el pool de conexiones Sage200:', err);
});

const connect = async () => {
  if (!connected) {
    try {
      await pool.connect();
      connected = true;
      logger.info('✅ Conexión a Sage200 establecida');
    } catch (err) {
      logger.error('❌ Error al conectar a Sage200:', {
        message: err.message,
        server: config.server,
        database: config.database,
        user: config.user,
      });
      throw err;
    }
  }
  return pool;
};

const getPool = () => {
  if (!connected) {
    throw new Error('Pool no inicializado. Llama a connect() primero.');
  }
  return pool;
};

module.exports = { connect, getPool };
