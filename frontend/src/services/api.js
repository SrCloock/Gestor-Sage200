import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      // Error del servidor (4xx, 5xx)
      return Promise.reject({
        message: error.response.data?.message || 'Error del servidor',
        status: error.response.status
      });
    } else if (error.request) {
      // No se recibió respuesta
      return Promise.reject({
        message: 'No se pudo conectar al servidor',
        status: 503
      });
    } else {
      // Error en la configuración
      return Promise.reject({
        message: 'Error en la configuración de la solicitud',
        status: 500
      });
    }
  }
);

export default api;

// Funciones específicas
export const login = (credentials) => api.post('/auth/login', credentials);
export const getProducts = () => api.get('/products');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createOrder = (orderData) => api.post('/orders', orderData);
export const getOrders = () => api.get('/orders');