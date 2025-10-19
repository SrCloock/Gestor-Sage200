import axios from 'axios';

const apiBase = window.location.hostname.includes('localhost')
  ? 'http://localhost:3000/api'
  : 'http://217.18.162.40:3000/api';

const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

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
