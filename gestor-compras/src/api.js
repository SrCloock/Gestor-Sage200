import axios from 'axios';

// 👇 Detectamos entorno
const apiBase = window.location.hostname.includes('localhost')
  ? 'https://54bf727d326f.ngrok-free.app/api'
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      return Promise.reject({
        message: error.response.data?.message || 'Error en la solicitud',
        status: error.response.status,
        data: error.response.data
      });
    }
    return Promise.reject(error);
  }
);

export default api;
