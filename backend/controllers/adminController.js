const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');
const bcrypt = require('bcryptjs');

exports.adminLogin = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError('Usuario y contraseña son requeridos', 400));
  }

  // Credenciales hardcodeadas (solo para desarrollo)
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return next(new AppError('Credenciales incorrectas', 401));
  }

  const token = jwt.sign(
    { id: 0, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.status(200).json({
    status: 'success',
    token
  });
};

exports.createUser = async (req, res, next) => {
  const { UsuarioLogicNet, ContraseñaLogicNet, RazonSocial, Nombre } = req.body;

  if (!UsuarioLogicNet || !ContraseñaLogicNet || !RazonSocial || !Nombre) {
    return next(new AppError('Todos los campos son requeridos', 400));
  }

  try {
    // 1. Obtener último código de cliente
    const lastCodeResult = await pool.request()
      .query(`
        SELECT TOP 1 CodigoCliente 
        FROM CLIENTES 
        WHERE CODIGOCATEGORIACLIENTE_='EMP' 
        ORDER BY CodigoCliente DESC
      `);

    const newCodigoCliente = (lastCodeResult.recordset[0]?.CodigoCliente || 0) + 1;

    // 2. Hashear contraseña
    const hashedPassword = await bcrypt.hash(ContraseñaLogicNet, 12);

    // 3. Crear nuevo usuario
    await pool.request()
      .input('CodigoCliente', newCodigoCliente)
      .input('UsuarioLogicNet', UsuarioLogicNet)
      .input('ContraseñaLogicNet', hashedPassword)
      .input('RazonSocial', RazonSocial)
      .input('Nombre', Nombre)
      .input('Categoria', 'EMP')
      .query(`
        INSERT INTO CLIENTES (
          CodigoCliente, UsuarioLogicNet, ContraseñaLogicNet,
          RazonSocial, Nombre, CODIGOCATEGORIACLIENTE_
        )
        VALUES (
          @CodigoCliente, @UsuarioLogicNet, @ContraseñaLogicNet,
          @RazonSocial, @Nombre, @Categoria
        )
      `);

    res.status(201).json({
      status: 'success',
      data: {
        CodigoCliente: newCodigoCliente,
        UsuarioLogicNet,
        RazonSocial,
        Nombre
      }
    });
  } catch (error) {
    next(new AppError('Error al crear el usuario', 500));
  }
};

exports.getLastClientCode = async (req, res, next) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT TOP 1 CodigoCliente 
        FROM CLIENTES 
        WHERE CODIGOCATEGORIACLIENTE_='EMP' 
        ORDER BY CodigoCliente DESC
      `);

    const lastCode = result.recordset[0]?.CodigoCliente || 0;

    res.json({
      status: 'success',
      data: {
        lastCode
      }
    });
  } catch (error) {
    next(new AppError('Error al obtener el último código', 500));
  }
};