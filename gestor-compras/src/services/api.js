import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// ========== AUTENTICACIÓN ==========
// Login administrador
export const loginAdmin = (credentials) => {
  return axios.post(`${API_URL}/auth/login`, { ...credentials, isAdmin: true });
};

// Login usuario Sage
export const loginSageUser = async (credentials) => {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  const { codigoEmpresa } = response.data;

  // Guardar en localStorage el código de empresa
  localStorage.setItem('codigoEmpresa', codigoEmpresa);

  return response;
};

// Obtener perfil de usuario
export const getUserProfile = (codigoCliente) => {
  return axios.get(`${API_URL}/auth/profile/${codigoCliente}`);
};

// ========== CATÁLOGO DE PRODUCTOS ==========
// Obtener todos los productos
export const getProductsFromSage = () => {
  return axios.get(`${API_URL}/products`);
};

// Buscar productos filtrados
export const getFilteredProducts = (filters) => {
  // filters: { nombreArticulo: "", proveedor: "", orden: "asc|desc" }
  return axios.get(`${API_URL}/products/filter`, { params: filters });
};

// ========== PROVEEDORES ==========
// Obtener proveedores
export const getProveedores = () => {
  return axios.get(`${API_URL}/products/proveedores`);
};

// ========== PEDIDOS ==========
// Obtener pedidos de un cliente
export const getPedidosByCliente = (codigoCliente) => {
  return axios.get(`${API_URL}/orders/${codigoCliente}`);
};

// Obtener detalle de un pedido
export const getPedidoDetalle = (codigoEmpresa, ejercicio, serie, numero) => {
  return axios.get(`${API_URL}/orders/detail`, {
    params: {
      codigoEmpresa,
      ejercicio,
      serie,
      numero
    }
  });
};

// Crear un pedido
export const createPedido = (pedidoData) => {
  return axios.post(`${API_URL}/orders`, pedidoData);
};

// ========== ADMINISTRADOR ==========
// Crear un nuevo usuario (admin)
export const createUser = (userData) => {
  return axios.post(`${API_URL}/admin/create-user`, userData);
};

// Obtener el último código de cliente (admin)
export const getLastClientCode = () => {
  return axios.get(`${API_URL}/admin/last-client-code`);
};

// ========== IMÁGENES ==========
// Subir imágenes
export const uploadImage = (formData) => {
  return axios.post(`${API_URL}/images/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
