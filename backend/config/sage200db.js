// Archivo: sage200db.js
const { ConnectionPool } = require('mssql');

const config = {
  server: 'SVRALANDALUS',
  database: 'DEMOS',
  user: 'administrador',
  password: 'admin2024',
  options: { encrypt: false, trustServerCertificate: true }
};

const pool = new ConnectionPool(config);
pool.connect().then(() => console.log('✅ Conectado a Sage200'));

module.exports = pool;