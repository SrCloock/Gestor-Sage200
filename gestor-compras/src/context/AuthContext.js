// context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Verificar sesión al cargar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include' // IMPORTANTE para las cookies de sesión
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setError('');
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRÍTICO para sesiones
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        throw new Error(data.message || 'Error en el login');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Error de conexión con el servidor');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setUser(null);
      setError('');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const clearError = () => {
    setError('');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      login, 
      logout,
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};