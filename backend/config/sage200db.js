
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
    connectTimeout: 30000 
  }
};

const pool = new ConnectionPool(config);


pool.on('error', err => {
  console.error('❌ Error permanente en el pool:', err);
});

module.exports = {
  pool,
  connect: async () => {
    try {
      await pool.connect();
      console.log('✅ Conexión a Sage200 establecida');
      return true;
    } catch (err) {
      console.error('❌ Fallo de conexión a Sage200:', {
        message: err.message,
        server: config.server,
        database: config.database,
        user: config.user,
        suggestion: 'Verifique: 1) Sage200 en ejecución 2) Usuario/contraseña 3) Servidor accesible'
      });
      return false;
    }
  }
};