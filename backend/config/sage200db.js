// backend/config/sage200db.js
const { ConnectionPool } = require('mssql');

const config = {
  server: process.env.SAGE200_SERVER || 'SVRALANDALUS',
  database: process.env.SAGE200_DATABASE || 'DEMOS',
  user: process.env.SAGE200_USER || 'Logic',
  password: process.env.SAGE200_PASSWORD || 'Sage2024+',
  options: { 
    encrypt: false,
    trustServerCertificate: true 
  }
};

const pool = new ConnectionPool(config);
pool.connect()
   .then(() => console.log('✅ Conectado a Sage200'))
   .catch(err => console.error('❌ Error de conexión:', err));

module.exports = pool;