const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Asegúrate de que 'database' esté correctamente configurado

const User = sequelize.define('User', {
  CodigoCliente: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,  // Asumiendo que el CódigoCliente es único
  },
  Nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  RazonSocial: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  CodigoEmpresa: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = User;
