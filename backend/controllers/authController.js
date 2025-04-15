const { pool } = require('../config/sage200db');

exports.login = async (req, res) => {
  const { UsuarioLogicNet, ContraseñaLogicNet } = req.body;

  try {
    const result = await pool.request()
      .input('UsuarioLogicNet', UsuarioLogicNet)
      .input('ContraseñaLogicNet', ContraseñaLogicNet)
      .query(`
        SELECT CodigoCategoriaCliente_, UsuarioLogicNet, ContraseñaLogicNet
        FROM CLIENTES 
		    WHERE CodigoCategoriaCliente_ = 'EMP'
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = result.recordset[0];
    res.json({
      CodigoCliente: user.CodigoCliente,
      RazonSocial: user.RazonSocial,
      Nombre: user.Nombre,
      CodigoEmpresa: user.CodigoEmpresa
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};