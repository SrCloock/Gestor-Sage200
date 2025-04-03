const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  console.error(`🔴 Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  next(new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  
  console.error(`🔴 Error ${err.statusCode}:`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl
  });

  res.status(err.statusCode).json({
    success: false,
    error: err.isOperational ? err.message : 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { notFound, errorHandler };