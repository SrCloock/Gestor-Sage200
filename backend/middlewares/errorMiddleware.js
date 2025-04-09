const AppError = require('../utils/AppError');

// Middleware para manejar ruta no encontrada
const notFound = (req, res, next) => {
  console.error(`🔴 Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  next(new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404));
};

// Middleware de manejo de errores
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  
  // Si el error es un error de base de datos (como SQL o conexión), lo manejamos de una forma especial
  if (err.code && err.code === 'EREQUEST') {
    // Ejemplo para los errores de base de datos con SQL
    console.error(`🔴 Error de base de datos:`, {
      message: err.message,
      code: err.code,
      stack: err.stack,
      url: req.originalUrl
    });

    // Lanzamos un error más entendible para el cliente
    err = new AppError('Error con la base de datos, por favor intente nuevamente.', 500);
  }

  // Si el error es de validación (como un campo faltante o inválido), lo manejamos también
  if (err.name === 'ValidationError') {
    console.error(`🔴 Error de validación:`, {
      message: err.message,
      details: err.errors,
      url: req.originalUrl
    });

    // Creamos un error más comprensible para el cliente
    err = new AppError('Datos inválidos proporcionados, por favor revisa los campos.', 400);
  }

  // Si el error es de autenticación o autorización, lo gestionamos también
  if (err.name === 'UnauthorizedError') {
    console.error(`🔴 Error de autorización:`, {
      message: err.message,
      url: req.originalUrl
    });

    err = new AppError('Acceso no autorizado, por favor verifica tus credenciales.', 401);
  }

  // Se registra el error en la consola para desarrollo
  console.error(`🔴 Error ${err.statusCode}:`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl
  });

  // Responder al cliente con el error
  res.status(err.statusCode).json({
    success: false,
    error: err.isOperational ? err.message : 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { notFound, errorHandler };
