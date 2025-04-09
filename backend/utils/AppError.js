class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
  
      // Capturar el stack trace de donde se llamó la función
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = AppError;
  