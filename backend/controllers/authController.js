const { pool } = require('../config/sage200db');

exports.login = async (req, res) => {
  const { UsuarioLogicNet, ContraseñaLogicNet, CodigoCliente } = req.body;

  try {
    const result = await pool.request()
      .input('UsuarioLogicNet', UsuarioLogicNet)
      .input('ContraseñaLogicNet', ContraseñaLogicNet)
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT CodigoCliente, RazonSocial, Nombre, CodigoEmpresa 
        FROM CLIENTES 
        WHERE UsuarioLogicNet = @UsuarioLogicNet 
        AND ContraseñaLogicNet = @ContraseñaLogicNet
        AND CodigoCliente = @CodigoCliente
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