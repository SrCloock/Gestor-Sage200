const { pool } = require('../config/sage200db');

const login = async (req, res) => {
  const { codigoCliente, contraseña } = req.body;

  if (!codigoCliente || !contraseña) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  try {
    const request = pool.request();
    request.input('CodigoCliente', codigoCliente);

    const result = await request.query(`
      SELECT 
        CodigoCliente,
        RazonSocial,
        CifDni,
        UsuarioLogicNet,
        ContraseñaLogicNet,
        CODIGOCATEGORIACLIENTE_,
        JefeDepartamento,
        DireccionPedido
      FROM Usuario
      WHERE CodigoCliente = @CodigoCliente
    `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.ContraseñaLogicNet !== contraseña) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Excluir la contraseña del resultado
    const { ContraseñaLogicNet, ...userData } = user;

    res.json({ message: 'Login exitoso', user: userData });
  } catch (err) {
    console.error('❌ Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  login,
};
