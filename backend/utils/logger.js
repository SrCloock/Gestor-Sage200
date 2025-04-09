// backend/utils/logger.js
const winston = require('winston');

// Definir el formato de los logs
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Crear el logger
const logger = winston.createLogger({
  level: 'info', // Nivel de log predeterminado
  format: winston.format.combine(
    winston.format.timestamp(),  // Agregar la marca de tiempo
    logFormat                    // Usar el formato personalizado
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }), // Mostrar logs en la consola
    new winston.transports.File({ filename: 'logs/app.log' })           // Guardar logs en archivo
  ]
});

// Exportar el logger para usarlo en otros archivos
module.exports = logger;
