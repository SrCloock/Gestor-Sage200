import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const fetchProducts = async () => {
  const response = await axios.get(`${API_BASE_URL}/products`);
  return response.data;
};

export const fetchProductById = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/products/${id}`);
  return response.data;
};

export const createOrder = async (orderData) => {
  const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
  return response.data;
};

export const fetchOrders = async () => {
  const response = await axios.get(`${API_BASE_URL}/orders`);
  return response.data;
};

export const testConnection = async () => {
  try {
    await axios.get(`${API_BASE_URL}/health`);
    return true;
  } catch (error) {
    console.error('Error de conexión:', error);
    return false;
  }
};