const { pool: sagePool } = require('../config/sage200db');
const AppError = require('../utils/AppError');

// Validar usuario en Sage200
exports.validateSageUser = async (username, password) => {
  try {
    // Aquí hace falta la sentencia SQL exacta para validar usuarios en Sage200
    const query = `
      SELECT Codigo, Nombre 
      FROM Usuarios 
      WHERE Usuario = ? AND Contraseña = ?  -- Ajustar nombres de campos según Sage200
    `;
    const [rows] = await sagePool.query(query, [username, password]);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    throw new AppError('Error al validar usuario en Sage200', 500);
  }
};

// Validar admin hardcodeado
exports.validateHardcodedAdmin = (username, password) => {
  if (username === 'admin' && password === '1234') {
    return { id: 0, name: 'Admin' }; // Datos ficticios para el admin
  }
  return null;
};