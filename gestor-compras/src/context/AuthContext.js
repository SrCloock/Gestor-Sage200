import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = window.location.hostname.includes('localhost')
    ? 'http://localhost:3000'
    : 'http://217.18.162.40:3000';

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      setError('');
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
        throw new Error('El servidor devolvió una respuesta inválida: ' + text.substring(0, 200));
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        throw new Error(data.message || 'Error en el login');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor');
      return false;
    }
  };

  const logout = () => {
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
