const { getPool } = require('../db/Sage200db');

const login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', username)
      .input('password', password)
      .query(`
        SELECT CodigoCliente, CifDni, UsuarioLogicNet 
        FROM CLIENTES 
        WHERE UsuarioLogicNet = @username 
        AND ContraseñaLogicNet = @password
        AND CodigoCategoriaCliente_ = 'EMP'
      `);

    if (result.recordset.length > 0) {
      return res.status(200).json({ 
        success: true, 
        user: result.recordset[0] 
      });
    }
    return res.status(200).json({ 
      success: false, 
      message: 'Credenciales incorrectas' 
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor' 
    });
  }
};

module.exports = { login }; // Asegúrate de exportar la función