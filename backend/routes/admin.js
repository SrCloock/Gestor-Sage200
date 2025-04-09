const express = require('express');
const router = express.Router();
const { getPool } = require('../config/sage200db');
const AppError = require('../utils/AppError');

// Middleware simple para acceso admin
const isAdmin = (req, res, next) => {
  const { adminKey } = req.headers;
  if (adminKey === 'clave-secreta-123') {
    next();
  } else {
    return next(new AppError('No autorizado', 401));
  }
};

router.post('/crear-usuario', isAdmin, async (req, res, next) => {
  const { nuevoUsuario } = req.body;

  try {
    const pool = getPool();
    await pool.request().query(`
      INSERT INTO CLIENTES (CodigoCliente, UsuarioLogicNet, ContraseñaLogicNet, RazonSocial, CODIGOCATEGORIACLIENTE_)
      VALUES ('${nuevoUsuario.CodigoCliente}', '${nuevoUsuario.UsuarioLogicNet}', '${nuevoUsuario.ContraseñaLogicNet}', '${nuevoUsuario.RazonSocial}', 'EMP')
    `);

    res.json({ message: 'Usuario creado correctamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
