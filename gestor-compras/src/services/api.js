import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const loginAdmin = (credentials) => {
  return axios.post(`${API_URL}/auth/login`, { ...credentials, isAdmin: true });
};

export const loginSageUser = (credentials) => {
  return axios.post(`${API_URL}/auth/login`, { ...credentials, isAdmin: false });
};
export const uploadImage = (formData) => {
  return axios.post(`${API_URL}/images/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getProductsFromSage = () => {
  return axios.get(`${API_URL}/products`);
  // NOTA: Aquí hace falta la sentencia SQL de Sage200 para proveedores
};