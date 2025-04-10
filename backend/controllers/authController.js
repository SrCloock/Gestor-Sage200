const { pool } = require('../config/sage200db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');

exports.login = async (req, res, next) => {
  const { UsuarioLogicNet, ContraseñaLogicNet, CodigoCliente } = req.body;

  if (!UsuarioLogicNet || !ContraseñaLogicNet || !CodigoCliente) {
    return next(new AppError('Usuario, contraseña y código cliente son requeridos', 400));
  }

  try {
    const query = `
      SELECT CodigoCliente, CodigoEmpresa, RazonSocial, Nombre, ContraseñaLogicNet
      FROM CLIENTES
      WHERE CODIGOCATEGORIACLIENTE_ = 'EMP'
        AND CodigoCliente = @CodigoCliente
        AND UsuarioLogicNet = @UsuarioLogicNet
    `;

    const result = await pool.request()
      .input('CodigoCliente', CodigoCliente)
      .input('UsuarioLogicNet', UsuarioLogicNet)
      .query(query);

    if (result.recordset.length === 0) {
      return next(new AppError('Credenciales incorrectas', 401));
    }

    const user = result.recordset[0];
    const passwordMatch = await bcrypt.compare(ContraseñaLogicNet, user.ContraseñaLogicNet);

    if (!passwordMatch) {
      return next(new AppError('Credenciales incorrectas', 401));
    }

    const token = jwt.sign(
      { id: user.CodigoCliente, empresa: user.CodigoEmpresa },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      status: 'success',
      token,
      user: {
        CodigoCliente: user.CodigoCliente,
        CodigoEmpresa: user.CodigoEmpresa,
        RazonSocial: user.RazonSocial,
        Nombre: user.Nombre
      }
    });
  } catch (error) {
    next(new AppError('Error al iniciar sesión', 500));
  }
};