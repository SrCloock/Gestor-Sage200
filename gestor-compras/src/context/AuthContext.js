import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 👇 Detectamos el entorno y fijamos la URL base
  const apiBase = window.location.hostname.includes('localhost')
    ? 'https://54bf727d326f.ngrok-free.app' // tu backend vía ngrok
    : window.location.origin; // en producción, mismo dominio

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('Usuario cargado desde localStorage:', userData);
      } catch (parseError) {
        console.error('Error parseando usuario desde localStorage:', parseError);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      setError('');
      console.log('Intentando login para usuario:', username);

      // 👇 usamos la base definida arriba
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no JSON:', text.substring(0, 200));
        throw new Error('El servidor devolvió una respuesta inválida');
      }

      const data = await response.json();
      console.log('Respuesta del login:', data);

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Login exitoso para usuario:', data.user);
        return true;
      } else {
        throw new Error(data.message || 'Error en el login');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Error de conexión con el servidor');
      return false;
    }
  };

  const logout = () => {
    console.log('Cerrando sesión...');
    setUser(null);
    setError('');
    localStorage.removeItem('user');
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  };

  const clearError = () => setError('');

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
