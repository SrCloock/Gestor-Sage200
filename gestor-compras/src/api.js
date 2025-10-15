import axios from 'axios';


const isProduction = !window.location.hostname.includes('localhost');

const api = axios.create({
  baseURL: isProduction ? '/api' : 'http://localhost:3000/api',
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
