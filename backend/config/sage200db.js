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
    connectTimeout: 15000,
    requestTimeout: 15000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const pool = new ConnectionPool(config);

// Conexión de prueba al iniciar
pool.connect()
  .then(() => {
    console.log('✅ Conexión exitosa a Sage200');
    // Prueba de consulta simple
    pool.request().query('SELECT TOP 1 * FROM Articulos')
      .then(result => {
        console.log(`📦 Primer artículo encontrado: ${result.recordset[0]?.Descripcion || 'No hay datos'}`);
      })
      .catch(queryErr => {
        console.error('❌ Error en consulta de prueba:', queryErr.message);
      });
  })
  .catch(err => {
    console.error('❌ Error de conexión a Sage200:', {
      message: err.message,
      server: config.server,
      database: config.database,
      suggestion: 'Verifica: 1) Servidor encendido 2) Credenciales 3) Firewall'
    });
  });

module.exports = {
  sage200Pool: pool,
  poolConnect: pool.connect()
};