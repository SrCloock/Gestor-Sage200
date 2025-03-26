import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const fetchProducts = async () => {
  try {
    console.log('Obteniendo productos desde API...');
    const response = await api.get('/products');
    
    if (!response.data) {
      throw new Error('La respuesta no contiene datos');
    }

    console.log(`✅ ${response.data.length} productos recibidos`);
    return response.data;
  } catch (error) {
    console.error('Error en fetchProducts:', {
      request: error.config,
      response: error.response?.data,
      message: error.message
    });

    throw {
      message: 'Error al cargar productos',
      details: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
};

// Opcional: Función para probar la conexión
export const testConnection = async () => {
  try {
    await api.get('/health');
    return true;
  } catch (error) {
    console.error('Error de conexión con el backend:', error);
    return false;
  }
};