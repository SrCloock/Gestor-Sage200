const { pool } = require('../config/sage200db');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const login = async (req, res, next) => {
  const { UsuarioLogicNet, password, CodigoCliente } = req.body;

  if (!UsuarioLogicNet || !password || !CodigoCliente) {
    return next(new AppError('Usuario, contraseña y código de cliente son requeridos', 400));
  }

  try {
    const result = await pool.request()
      .input('UsuarioLogicNet', UsuarioLogicNet)
      .input('password', password)
      .input('CodigoCliente', CodigoCliente)
      .query(`
        SELECT 
          CodigoCliente, CodigoEmpresa, 
          RazonSocial, Nombre,
          CONCAT(RazonSocial, ' - ', Nombre) as NombreCompleto
        FROM CLIENTES 
        WHERE CODIGOCATEGORIACLIENTE_='EMP'
          AND CodigoCliente = @CodigoCliente
          AND UsuarioLogicNet = @UsuarioLogicNet
          AND ContraseñaLogicNet = @password
      `);

    if (result.recordset.length === 0) {
      return next(new AppError('Credenciales incorrectas', 401));
    }

    const user = result.recordset[0];
    const token = jwt.sign(
      { 
        id: user.CodigoCliente,
        empresa: user.CodigoEmpresa,
        role: 'user' 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          CodigoCliente: user.CodigoCliente,
          CodigoEmpresa: user.CodigoEmpresa,
          RazonSocial: user.RazonSocial,
          Nombre: user.NombreCompleto
        }
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    next(new AppError('Error al iniciar sesión', 500));
  }
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('No estás autorizado para acceder a esta ruta', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const currentUser = await pool.request()
      .input('CodigoCliente', decoded.id)
      .query('SELECT * FROM CLIENTES WHERE CodigoCliente = @CodigoCliente');
    
    if (!currentUser.recordset.length) {
      return next(new AppError('El usuario ya no existe', 401));
    }

    req.user = currentUser.recordset[0];
    next();
  } catch (error) {
    next(new AppError('Error en la autenticación', 401));
  }
};

module.exports = { login, protect };