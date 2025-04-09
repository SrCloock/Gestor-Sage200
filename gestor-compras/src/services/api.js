import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const loginUser = async (credentials) => {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await axios.post(`${API_URL}/admin`, userData);
  return response.data;
};

export const getOrders = async () => {
  const response = await axios.get(`${API_URL}/orders`);
  return response.data;
};

export const createOrder = async (orderData) => {
  const response = await axios.post(`${API_URL}/orders`, orderData);
  return response.data;
};

export const getOrderDetails = async (orderId) => {
  const response = await axios.get(`${API_URL}/orders/${orderId}`);
  return response.data;
};

export const getProducts = async (search = '') => {
  const response = await axios.get(`${API_URL}/products`, {
    params: { search },
  });
  return response.data;
};
