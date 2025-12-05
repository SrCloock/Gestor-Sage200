const { getPool } = require('../db/Sage200db');

const login = async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Usuario y contraseña son requeridos' 
    });
  }
  
  try {
    const pool = await getPool();
    console.log('🔐 Intento de login para usuario:', username);
    
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
          StatusAdministrador,
          CodigoEmpresa
        FROM CLIENTES 
        WHERE UsuarioLogicNet = @username 
        AND ContraseñaLogicNet = @password
        AND CodigoCategoriaCliente_ = 'EMP'
      `);

    if (result.recordset.length > 0) {
      const userData = result.recordset[0];
      const isAdmin = userData.StatusAdministrador === -1;
      
      // Crear objeto usuario con todos los datos importantes
      const user = {
        codigoCliente: userData.CodigoCliente ? userData.CodigoCliente.trim() : '',
        cifDni: userData.CifDni ? userData.CifDni.trim() : '',
        username: userData.UsuarioLogicNet || '',
        razonSocial: userData.RazonSocial || '',
        domicilio: userData.Domicilio || '',
        codigoPostal: userData.CodigoPostal || '',
        municipio: userData.Municipio || '',
        provincia: userData.Provincia || '',
        codigoProvincia: userData.CodigoProvincia || '',
        codigoNacion: userData.CodigoNacion || 'ES',
        nacion: userData.Nacion || '',
        siglaNacion: userData.SiglaNacion || 'ES',
        isAdmin: isAdmin,
        codigoEmpresa: userData.CodigoEmpresa ? String(userData.CodigoEmpresa).trim() : '1'  // ← CRÍTICO: Conversión a string
      };

      console.log('✅ Login exitoso:', { 
        username: user.username, 
        codigoEmpresa: user.codigoEmpresa,
        codigoCliente: user.codigoCliente,
        isAdmin: user.isAdmin
      });
      
      // 🔥 GUARDAR EN SESIÓN (CRÍTICO)
      req.session.user = user;
      
      // Guardar sesión explícitamente
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error guardando sesión:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error al iniciar sesión' 
          });
        }
        
        console.log('💾 Sesión guardada con ID:', req.sessionID);
        
        return res.status(200).json({ 
          success: true, 
          user: user,
          sessionId: req.sessionID
        });
      });
      
    } else {
      console.log('❌ Credenciales incorrectas para:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas o no tiene permisos' 
      });
    }
  } catch (error) {
    console.error('❌ Error en login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const logout = (req, res) => {
  if (req.session) {
    const username = req.session.user?.username || 'Desconocido';
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error al cerrar sesión:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al cerrar sesión' 
        });
      }
      
      res.clearCookie('connect.sid');
      console.log('👋 Sesión cerrada para:', username);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Sesión cerrada correctamente' 
      });
    });
  } else {
    return res.status(200).json({ 
      success: true, 
      message: 'No hay sesión activa' 
    });
  }
};

// Middleware para verificar sesión activa
const checkSession = (req, res, next) => {
  if (req.session && req.session.user) {
    console.log('🔍 Sesión activa para:', req.session.user.username);
    req.user = req.session.user;
    next();
  } else {
    console.log('⚠️ No hay sesión activa');
    res.status(401).json({ 
      success: false, 
      message: 'No autenticado. Por favor, inicie sesión.' 
    });
  }
};

// Middleware para obtener usuario desde sesión (para rutas que no requieren auth estricta)
const getUserFromSession = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    console.log('👤 Usuario cargado desde sesión:', req.user.username);
  } else {
    console.log('📭 No hay usuario en sesión');
    req.user = null;
  }
  next();
};

// Middleware para verificar si es administrador
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    console.log('👑 Usuario admin:', req.session.user.username);
    req.user = req.session.user;
    next();
  } else {
    console.log('🚫 Acceso denegado - No es admin');
    res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requieren permisos de administrador.' 
    });
  }
};

// Verificar estado de sesión (para el frontend)
const getSessionStatus = (req, res) => {
  if (req.session && req.session.user) {
    console.log('📊 Estado de sesión: ACTIVA para', req.session.user.username);
    
    // Actualizar datos del usuario desde DB (opcional)
    return res.status(200).json({ 
      success: true, 
      authenticated: true,
      user: req.session.user,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('📊 Estado de sesión: NO AUTENTICADO');
    return res.status(200).json({ 
      success: true, 
      authenticated: false,
      message: 'No hay sesión activa'
    });
  }
};

module.exports = { 
  login, 
  logout, 
  checkSession, 
  getUserFromSession, 
  isAdmin,
  getSessionStatus
};