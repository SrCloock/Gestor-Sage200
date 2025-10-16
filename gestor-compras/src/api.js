// api.js
import axios from 'axios';

// Usar URL relativa para evitar problemas CORS
const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // 🔥 IMPORTANTE para cookies/sesiones
});

// Interceptor para respuestas
api.interceptors.response.use(
  response => response,
  error => {
    console.error('Error en interceptor:', error.response?.status, error.message);
    
    if (error.response?.status === 401) {
      // Sesión expirada
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    if (error.message?.includes('Network Error')) {
      console.error('🚨 Error de conexión con el servidor');
    }
    
    return Promise.reject(error);
  }
);

export default api;