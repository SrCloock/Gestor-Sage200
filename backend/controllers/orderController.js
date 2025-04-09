// Ordenar y añadir a la base de datos
const { pool } = require('../config/sage200db');

exports.insertOrder = async (orderData) => {
  try {
    const { CodigoCliente, items, observaciones, EjercicioPedido, SeriePedido, NumeroPedido, CodigoEmpresa, RazonSocial } = orderData;

    const query = `
      INSERT INTO Pedidos (CodigoCliente, Items, Observaciones, EjercicioPedido, SeriePedido, NumeroPedido, CodigoEmpresa, RazonSocial)
      VALUES (@CodigoCliente, @items, @observaciones, @EjercicioPedido, @SeriePedido, @NumeroPedido, @CodigoEmpresa, @RazonSocial);
    `;

    const result = await pool.request()
      .input('CodigoCliente', sql.Int, CodigoCliente)
      .input('items', sql.VarChar, JSON.stringify(items))
      .input('observaciones', sql.VarChar, observaciones)
      .input('EjercicioPedido', sql.Int, EjercicioPedido)
      .input('SeriePedido', sql.VarChar, SeriePedido)
      .input('NumeroPedido', sql.Int, NumeroPedido)
      .input('CodigoEmpresa', sql.Int, CodigoEmpresa)
      .input('RazonSocial', sql.VarChar, RazonSocial)
      .query(query);

    return result.recordset;
  } catch (error) {
    throw new Error(error.message);
  }
};
