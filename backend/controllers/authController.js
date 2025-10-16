// controllers/authController.js
const { getPool } = require('../db/Sage200db');

const login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const pool = await getPool();
    
    // PRIMERO intentar con la tabla CLIENTES (tu versión funcional)
    const clientResult = await pool.request()
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

    if (clientResult.recordset.length > 0) {
      const userData = clientResult.recordset[0];
      const isAdmin = userData.StatusAdministrador === -1;
      
      // Guardar en sesión
      req.session.user = {
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
      };

      return res.status(200).json({ 
        success: true, 
        user: req.session.user
      });
    }

    // SI FALLA, intentar con la tabla Usuarios (nueva versión)
    const userResult = await pool.request()
      .input('username', username)
      .input('password', password)
      .query(`
        SELECT 
          u.CodigoUsuario as codigoUsuario,
          u.Nombre as nombre,
          u.CodigoCliente as codigoCliente,
          u.CodigoEmpresa as codigoEmpresa,
          c.RazonSocial as razonSocial,
          c.CifDni as cifDni,
          u.EsAdministrador as isAdmin,
          u.Activo as activo
        FROM Usuarios u
        LEFT JOIN Clientes c ON u.CodigoCliente = c.CodigoCliente
        WHERE u.CodigoUsuario = @username 
        AND u.Password = @password
        AND u.Activo = 1
      `);

    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];
      
      req.session.user = {
        codigoUsuario: user.codigoUsuario,
        nombre: user.nombre,
        codigoCliente: user.codigoCliente,
        codigoEmpresa: user.codigoEmpresa,
        razonSocial: user.razonSocial,
        cifDni: user.cifDni,
        isAdmin: user.isAdmin === 1
      };

      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        user: req.session.user
      });
    }

    // Si ambas consultas fallan
    return res.status(401).json({ 
      success: false, 
      message: 'Credenciales incorrectas o no tiene permisos' 
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
    
    res.clearCookie('connect.sid');
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  });
};

const getCurrentUser = (req, res) => {
  if (req.session.user) {
    res.status(200).json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'No hay sesión activa'
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser
};