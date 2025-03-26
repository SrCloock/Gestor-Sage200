const { ConnectionPool } = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  server: process.env.SAGE200_SERVER || 'SVRALANDALUS',
  database: process.env.SAGE200_DATABASE || 'DEMOS',
  user: process.env.SAGE200_USER || 'Logic',
  password: process.env.SAGE200_PASSWORD || 'Sage2024+',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const pool = new ConnectionPool(config);
const poolConnect = pool.connect()
  .then(() => {
    console.log('✅ Conexión establecida con Sage200');
    return pool;
  })
  .catch(err => {
    console.error('❌ Error de conexión a Sage200:', {
      message: err.message,
      code: err.code,
      server: config.server,
      database: config.database
    });
    throw err;
  });

module.exports = {
  sage200Pool: pool,
  poolConnect
};