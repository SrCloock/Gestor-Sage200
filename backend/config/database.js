// backend/config/database.js

const { Sequelize } = require('sequelize');

// Conexión a la base de datos
const sequelize = new Sequelize('nombre_de_base_de_datos', 'usuario', 'contraseña', {
  host: 'localhost',
  dialect: 'mysql', // Puedes usar 'postgres' si estás usando PostgreSQL
  logging: false, // Desactivar los logs de la consola (opcional)
});

module.exports = sequelize;
