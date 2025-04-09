const AppError = require('../utils/AppError');
const { pool } = require('../config/sage200db');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res, next) => {
  try {
    const { usuarioLogicNet, contrasenaLogicNet, codigoCliente, codigoEmpresa, nombre, razonSocial } = req.body;

    // Validación de campos requeridos
    if (!usuarioLogicNet || !contrasenaLogicNet || !codigoCliente || !codigoEmpresa) {
      throw new AppError('Todos los campos son obligatorios', 400);
    }

    // Verificar si el usuario ya existe
    const userExists = await pool.request()
      .input('UsuarioLogicNet', usuarioLogicNet)
      .query('SELECT 1 FROM CLIENTES WHERE UsuarioLogicNet = @UsuarioLogicNet');

    if (userExists.recordset.length > 0) {
      throw new AppError('El usuario ya existe', 409);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contrasenaLogicNet, 12);

    // Crear el usuario
    await pool.request()
      .input('UsuarioLogicNet', usuarioLogicNet)
      .input('ContraseñaLogicNet', hashedPassword)
      .input('CodigoCliente', codigoCliente)
      .input('CodigoEmpresa', codigoEmpresa)
      .input('Nombre', nombre)
      .input('RazonSocial', razonSocial)
      .input('CodigoCategoriaCliente', 'EMP')
      .query(`
        INSERT INTO CLIENTES (
          UsuarioLogicNet, ContraseñaLogicNet, CodigoCliente, 
          CodigoEmpresa, Nombre, RazonSocial, CODIGOCATEGORIACLIENTE_
        )
        VALUES (
          @UsuarioLogicNet, @ContraseñaLogicNet, @CodigoCliente,
          @CodigoEmpresa, @Nombre, @RazonSocial, @CodigoCategoriaCliente
        )
      `);

    res.status(201).json({
      status: 'success',
      message: 'Usuario creado correctamente'
    });

  } catch (error) {
    logger.error('Error en createUser:', error);
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT 
          UsuarioLogicNet, CodigoCliente, CodigoEmpresa,
          Nombre, RazonSocial
        FROM CLIENTES
        WHERE CODIGOCATEGORIACLIENTE_ = 'EMP'
        ORDER BY CodigoEmpresa, CodigoCliente
      `);

    res.status(200).json({
      status: 'success',
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};