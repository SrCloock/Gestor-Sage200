import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = window.location.hostname.includes('localhost')
    ? 'http://localhost:3000'
    : 'http://84.120.61.159:3000';

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('🔄 Usuario cargado desde localStorage:', {
          username: userData.username,
          isAdmin: userData.isAdmin
        });
        setUser(userData);
      } catch {
        console.error('❌ Error parseando usuario del localStorage');
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
        console.log('✅ Login exitoso:', {
          username: data.user.username,
          isAdmin: data.user.isAdmin
        });
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        throw new Error(data.message || 'Error en el login');
      }
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError(err.message || 'Error de conexión con el servidor');
      return false;
    }
  };

  const logout = () => {
    console.log('🚪 Cerrando sesión...');
    setUser(null);
    setError('');
    localStorage.removeItem('user');
    
    // Limpiar cualquier cookie de sesión
    fetch(`${apiBase}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    }).catch(err => console.error('Error en logout:', err));
    
    // Redirección inmediata
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};