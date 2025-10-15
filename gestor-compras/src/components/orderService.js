import axios from 'axios';

// 🔧 URL base: usa la del entorno o por defecto '/api'
const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // 🔥 Importante para cookies / sesiones
});

// ========== INTERCEPTORES ==========

// Añade el token a las peticiones (si existe)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Manejo global de errores
api.interceptors.response.use(
  response => response,
  error => {
    console.error('Error en interceptor:', error.response?.status, error.message);
    
    if (error.response?.status === 401) {
      // Si el usuario perdió la sesión
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setTimeout(() => {
        window.location.href = '/login'; // 🔥 corregido: antes decía /api/login
      }, 100);
    }
    
    if (error.message?.includes('Network Error')) {
      console.error('🚨 Error de conexión con el servidor');
    }
    
    return Promise.reject(error);
  }
);

// ========== ENDPOINTS ==========

// 🔐 Autenticación
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

export const getProfile = () => api.get('/auth/me');
export const adminLogin = (credentials) => api.post('/admin/login', credentials);

// 🛒 Productos
export const getProducts = async () => {
  try {
    const response = await api.get('/products');
    return response;
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    throw error;
  }
};

export const searchProducts = (filters) => api.get('/products/search', { params: filters });
export const getProductById = (id) => api.get(`/products/${id}`);

// 📦 Pedidos
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/orders', orderData);
    return response;
  } catch (error) {
    console.error('Error creando pedido:', error);
    throw error;
  }
};

export const getOrders = async (CodigoCliente) => {
  try {
    const response = await api.get(`/orders/${CodigoCliente}`);
    return response;
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    throw error;
  }
};

export const getOrderDetail = (CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido) => {
  return api.get('/orders/detail', {
    params: { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido }
  });
};

// ⚙️ Administración
export const createUser = (userData) => api.post('/admin/users', userData);
export const getLastClientCode = () => api.get('/admin/last-client-code');

export default api;
