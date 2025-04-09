const { getPool } = require('../config/sage200db');
const AppError = require('../utils/AppError');

exports.login = async (req, res, next) => {
  const { usuario, contraseña, codigoCliente } = req.body;

  try {
    const pool = getPool();
    const result = await pool.request()
      .query(`SELECT * FROM CLIENTES WHERE CODIGOCATEGORIACLIENTE_='EMP' AND CodigoCliente = '${codigoCliente}'`);

    const user = result.recordset[0];

    if (!user) return next(new AppError('Usuario no encontrado', 404));
    if (user.UsuarioLogicNet !== usuario || user.ContraseñaLogicNet !== contraseña)
      return next(new AppError('Credenciales inválidas', 401));

    res.json({
      message: 'Login exitoso',
      data: {
        codigoCliente: user.CodigoCliente,
        razonSocial: user.RazonSocial,
        nombre: `${user.RazonSocial} - ${user.Nombre || ''}`.trim(),
        codigoEmpresa: user.CodigoEmpresa
      }
    });
  } catch (err) {
    next(new AppError('Error al conectar con la base de datos', 500));
  }
};
