const { getPool } = require('../db/Sage200db');

const login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', username)
      .input('password', password)
      .query(`
        SELECT 
          CodigoCliente, 
          CifDni, 
          UsuarioLogicNet,
          RazonSocial,
          Domicilio,
          CodigoPostal,
          Municipio,
          Provincia,
          CodigoProvincia,
          CodigoNacion,
          Nacion,
          SiglaNacion,
          StatusAdministrador
        FROM CLIENTES 
        WHERE UsuarioLogicNet = @username 
        AND ContraseñaLogicNet = @password
        AND CodigoCategoriaCliente_ = 'EMP'
      `);

    if (result.recordset.length > 0) {
      const userData = result.recordset[0];
      const isAdmin = userData.StatusAdministrador === -1;
      
      return res.status(200).json({ 
        success: true, 
        user: {
          codigoCliente: userData.CodigoCliente.trim(),
          cifDni: userData.CifDni.trim(),
          username: userData.UsuarioLogicNet,
          razonSocial: userData.RazonSocial,
          domicilio: userData.Domicilio || '',
          codigoPostal: userData.CodigoPostal || '',
          municipio: userData.Municipio || '',
          provincia: userData.Provincia || '',
          codigoProvincia: userData.CodigoProvincia || '',
          codigoNacion: userData.CodigoNacion || 'ES',
          nacion: userData.Nacion || '',
          siglaNacion: userData.SiglaNacion || 'ES',
          isAdmin: isAdmin
        }
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas o no tiene permisos' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor' 
    });
  }
};

const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true });
  });
};

module.exports = { login, logout };