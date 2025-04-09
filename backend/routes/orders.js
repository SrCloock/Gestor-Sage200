const express = require('express');
const router = express.Router();
const { getPool } = require('../config/sage200db');

// Obtener cabeceras de pedidos
router.get('/cabecera', async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT * FROM CabeceraPedidoCliente 
      ORDER BY CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido
    `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// Obtener líneas de pedido
router.get('/lineas', async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT * FROM LineasPedidoCliente 
      ORDER BY CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden
    `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
