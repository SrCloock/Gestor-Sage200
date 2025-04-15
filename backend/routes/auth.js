const express = require('express');
const router = express.Router();
const { connect } = require('../config/sage200db');

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const pool = await connect();
    const result = await pool.request()
      .input('usuario', usuario)
      .input('password', password)
      .query(`
        SELECT CodigoCliente, CifDni, CodigoCategoriaCliente_, UsuarioLogicNet 
        FROM CLIENTES 
        WHERE UsuarioLogicNet = @usuario 
        AND ContraseñaLogicNet = @password 
        AND CodigoCategoriaCliente_ = 'EMP'`);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas o no es empleado' });
    }

    const user = result.recordset[0];
    // Generar un token simple (alternativa básica a JWT)
    const simpleToken = Buffer.from(`${usuario}:${Date.now()}`).toString('base64');
    
    res.json({ 
      token: simpleToken,
      user: {
        codigoCliente: user.CodigoCliente,
        cifDni: user.CifDni,
        usuario: user.UsuarioLogicNet
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;