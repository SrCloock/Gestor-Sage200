const AppError = require('../utils/AppError');

module.exports = (err, req, res, next) => {
  console.error('🔥 ErrorMiddleware:', err);

  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).json({
    status: err.status || 'error',
    message: err.message || 'Internal Server Error',
  });
};
