// backend/controllers/adminController.js

const { pool } = require('../config/sage200db');
const AppError = require('../utils/AppError');

// Crear nuevo usuario
exports.createUser = async (req, res, next) => {
  const { usuarioLogicNet, contrasenaLogicNet, codigoCliente, codigoEmpresa } = req.body;

  if (!usuarioLogicNet || !contrasenaLogicNet || !codigoCliente || !codigoEmpresa) {
    return next(new AppError('Faltan datos obligatorios para crear el usuario.', 400));
  }

  try {
    // Verificar si el usuario ya existe
    const checkUserExists = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .input('UsuarioLogicNet', usuarioLogicNet)
      .query(`
        SELECT * FROM Usuarios WHERE CodigoCliente = @CodigoCliente AND UsuarioLogicNet = @UsuarioLogicNet
      `);

    if (checkUserExists.recordset.length > 0) {
      return next(new AppError('El usuario ya existe.', 409)); // 409 Conflict
    }

    // Insertar nuevo usuario
    await pool.request()
      .input('UsuarioLogicNet', usuarioLogicNet)
      .input('ContraseñaLogicNet', contrasenaLogicNet)
      .input('CodigoCliente', codigoCliente)
      .input('CodigoEmpresa', codigoEmpresa)
      .query(`
        INSERT INTO Usuarios (UsuarioLogicNet, ContraseñaLogicNet, CodigoCliente, CodigoEmpresa)
        VALUES (@UsuarioLogicNet, @ContraseñaLogicNet, @CodigoCliente, @CodigoEmpresa)
      `);

    res.status(201).json({
      status: 'success',
      message: 'Usuario creado con éxito',
      data: { usuarioLogicNet, codigoCliente, codigoEmpresa },
    });
  } catch (error) {
    return next(new AppError('Error al crear el usuario: ' + error.message, 500));
  }
};

// Obtener usuarios por código de cliente
exports.getUsersByCodigoCliente = async (req, res, next) => {
  const { codigoCliente } = req.params;

  if (!codigoCliente) {
    return next(new AppError('Faltó el código de cliente en la solicitud.', 400));
  }

  try {
    const result = await pool.request()
      .input('CodigoCliente', codigoCliente)
      .query(`
        SELECT * FROM Usuarios WHERE CodigoCliente = @CodigoCliente
      `);

    if (result.recordset.length === 0) {
      return next(new AppError('No se encontraron usuarios para el código de cliente proporcionado.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: result.recordset,
    });
  } catch (error) {
    return next(new AppError('Error al obtener los usuarios: ' + error.message, 500));
  }
};

// Obtener todos los pedidos de una empresa
exports.getPedidosByCodigoEmpresa = async (req, res, next) => {
  const { codigoEmpresa } = req.params;

  if (!codigoEmpresa) {
    return next(new AppError('Faltó el código de empresa en la solicitud.', 400));
  }

  try {
    const result = await pool.request()
      .input('CodigoEmpresa', codigoEmpresa)
      .query(`
        SELECT * FROM CabeceraPedidoCliente WHERE CodigoEmpresa = @CodigoEmpresa
        ORDER BY EjercicioPedido, SeriePedido, NumeroPedido
      `);

    if (result.recordset.length === 0) {
      return next(new AppError('No se encontraron pedidos para la empresa proporcionada.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: result.recordset,
    });
  } catch (error) {
    return next(new AppError('Error al obtener los pedidos: ' + error.message, 500));
  }
};

// Modificar datos de un pedido (Ej. cambiar la razón social, proveedor, etc)
exports.updatePedido = async (req, res, next) => {
  const { codigoEmpresa, ejercicioPedido, seriePedido, numeroPedido, nuevosDatos } = req.body;

  if (!codigoEmpresa || !ejercicioPedido || !seriePedido || !numeroPedido || !nuevosDatos) {
    return next(new AppError('Faltan datos obligatorios para actualizar el pedido.', 400));
  }

  try {
    // Validar que el pedido existe
    const result = await pool.request()
      .input('CodigoEmpresa', codigoEmpresa)
      .input('EjercicioPedido', ejercicioPedido)
      .input('SeriePedido', seriePedido)
      .input('NumeroPedido', numeroPedido)
      .query(`
        SELECT * FROM CabeceraPedidoCliente
        WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
      `);

    if (result.recordset.length === 0) {
      return next(new AppError('No se encontró el pedido para actualizar.', 404));
    }

    // Actualizar los datos del pedido
    const updateResult = await pool.request()
      .input('CodigoEmpresa', codigoEmpresa)
      .input('EjercicioPedido', ejercicioPedido)
      .input('SeriePedido', seriePedido)
      .input('NumeroPedido', numeroPedido)
      .input('NuevosDatos', nuevosDatos)
      .query(`
        UPDATE CabeceraPedidoCliente
        SET DatosPedido = @NuevosDatos
        WHERE CodigoEmpresa = @CodigoEmpresa
          AND EjercicioPedido = @EjercicioPedido
          AND SeriePedido = @SeriePedido
          AND NumeroPedido = @NumeroPedido
      `);

    if (updateResult.rowsAffected[0] === 0) {
      return next(new AppError('No se pudo actualizar el pedido.', 500));
    }

    res.status(200).json({
      status: 'success',
      message: 'Pedido actualizado correctamente.',
    });
  } catch (error) {
    return next(new AppError('Error al actualizar el pedido: ' + error.message, 500));
  }
};
