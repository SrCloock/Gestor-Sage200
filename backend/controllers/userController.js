// Obtener usuario por código cliente
const { pool } = require('../config/sage200db');

exports.getUserByCodigoCliente = async (codigoCliente) => {
  try {
    const query = `
      SELECT * FROM Usuarios WHERE CodigoCliente = @codigoCliente;
    `;

    const result = await pool.request().input('codigoCliente', sql.Int, codigoCliente).query(query);

    if (!result.recordset.length) {
      return null;
    }

    return result.recordset[0];
  } catch (error) {
    throw new Error(error.message);
  }
};

// Generar número de pedido
exports.generateNumeroPedido = async (codigoEmpresa) => {
  try {
    const query = `
      SELECT MAX(NumeroPedido) AS lastOrder
      FROM Pedidos
      WHERE CodigoEmpresa = @codigoEmpresa;
    `;
    const result = await pool.request().input('codigoEmpresa', sql.Int, codigoEmpresa).query(query);
    const lastOrder = result.recordset[0]?.lastOrder || 0;
    return lastOrder + 1;
  } catch (error) {
    throw new Error(error.message);
  }
};
