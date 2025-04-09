// backend/utils/validators.js

// Función para validar si un string es un número
const isNumber = (value) => {
    return !isNaN(value);
  };
  
  // Función para validar un email básico
  const isEmail = (value) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(value);
  };
  
  // Función para validar si un campo está vacío
  const isEmpty = (value) => {
    return !value || value.trim() === '';
  };
  
  // Exportar las funciones de validación
  module.exports = {
    isNumber,
    isEmail,
    isEmpty,
  };
  