const express = require('express');
const router = express.Router();
const { connect } = require('../config/sage200db');
const authenticate = require('../middlewares/auth');

router.get('/mis-pedidos', authenticate, async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('codigoCliente', req.headers['x-client-id'])
      .query(`
        SELECT * FROM CabeceraPedidoCliente 
        WHERE CodigoCliente = @codigoCliente 
        ORDER BY FechaPedido DESC`);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

module.exports = router;