import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token a las peticiones
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Interceptor MEJORADO para manejar errores globales
api.interceptors.response.use(response => {
  return response;
}, error => {
  console.error('Error en interceptor:', error.response?.status, error.message);
  
  if (error.response?.status === 401) {
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/api/login')) {
      console.warn('Sesión expirada, redirigiendo a login...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 100);
    }
  }
  
  if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
    console.error('Error de conexión con el servidor');
  }
  
  return Promise.reject(error);
});

// ========== AUTENTICACIÓN ==========
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    return response;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

export const getProfile = () => {
  return api.get('/api/auth/me');
};

export const adminLogin = (credentials) => {
  return api.post('/api/admin/login', credentials);
};

// ========== PRODUCTOS ==========
export const getProducts = async () => {
  try {
    const response = await api.get('/api/products');
    return response;
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    throw error;
  }
};

export const searchProducts = (filters) => {
  return api.get('/api/products/search', { params: filters });
};

export const getProductById = (id) => {
  return api.get('/api/products/${id}');
};

// ========== PEDIDOS ==========
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/api/orders', orderData);
    return response;
  } catch (error) {
    console.error('Error creando pedido:', error);
    if (error.response?.status === 401) {
      console.warn('Sesión expirada durante creación de pedido');
    }
    throw error;
  }
};

export const getOrders = async (CodigoCliente) => {
  try {
    const response = await api.get('/api/orders/${CodigoCliente}');
    return response;
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    throw error;
  }
};

export const getOrderDetail = (CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido) => {
  return api.get('/api/orders/detail', {
    params: { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido }
  });
};

// ========== ADMINISTRACIÓN ==========
export const createUser = (userData) => {
  return api.post('/api/admin/users', userData);
};

export const getLastClientCode = () => {
  return api.get('/api/admin/last-client-code');
};

export default api;