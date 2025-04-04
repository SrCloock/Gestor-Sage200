const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'gestor_compras',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificación y creación de tablas si no existen
pool.getConnection()
  .then(async (connection) => {
    console.log('✅ Conexión a MySQL exitosa');
    
    // Crear tabla de imágenes si no existe
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a MySQL:', err.message);
  });

module.exports = { pool };