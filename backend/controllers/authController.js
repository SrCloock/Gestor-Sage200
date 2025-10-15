const { getPool } = require('../db/Sage200db');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    const pool = await getPool();
    
    // Buscar usuario en la base de datos
    const result = await pool.request()
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

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const user = result.recordset[0];

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    // Establecer sesión
    req.session.user = {
      codigoUsuario: user.codigoUsuario,
      nombre: user.nombre,
      codigoCliente: user.codigoCliente,
      codigoEmpresa: user.codigoEmpresa,
      razonSocial: user.razonSocial,
      cifDni: user.cifDni,
      isAdmin: user.isAdmin === 1
    };

    console.log('Login exitoso para usuario:', user.codigoUsuario);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: req.session.user
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
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