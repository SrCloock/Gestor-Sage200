import axios from 'axios';
import { getToken } from '../utils/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token a las peticiones
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Interceptor para manejar errores globales
api.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response?.status === 401) {
    // Manejar logout si el token es inválido
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

// ========== AUTENTICACIÓN ==========
export const loginUser = (credentials) => {
  return api.post('/auth/login', credentials);
};

export const getProfile = () => {
  return api.get('/auth/me');
};

export const adminLogin = (credentials) => {
  return api.post('/admin/login', credentials);
};

// ========== PRODUCTOS ==========
export const getProducts = () => {
  return api.get('/products');
};

export const searchProducts = (filters) => {
  return api.get('/products/search', { params: filters });
};

export const getProductById = (id) => {
  return api.get(`/products/${id}`);
};

// ========== PEDIDOS ==========
export const createOrder = (orderData) => {
  return api.post('/orders', orderData);
};

export const getOrders = (CodigoCliente) => {
  return api.get(`/orders/${CodigoCliente}`);
};

export const getOrderDetail = (CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido) => {
  return api.get('/orders/detail', {
    params: { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido }
  });
};

// ========== ADMINISTRACIÓN ==========
export const createUser = (userData) => {
  return api.post('/admin/users', userData);
};

export const getLastClientCode = () => {
  return api.get('/admin/last-client-code');
};

export default api;