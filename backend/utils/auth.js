// Funciones de ayuda para manejar la autenticación
export const getToken = () => {
    return localStorage.getItem('token');
  };
  
  export const setToken = (token) => {
    localStorage.setItem('token', token);
  };
  
  export const removeToken = () => {
    localStorage.removeItem('token');
  };
  
  export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  };
  
  export const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  };
  
  export const removeUser = () => {
    localStorage.removeItem('user');
  };
  
  export const isAuthenticated = () => {
    return !!getToken();
  };
  
  export const logout = () => {
    removeToken();
    removeUser();
    window.location.href = '/login';
  };
  
  // Verificar expiración del token (opcional)
  export const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded.exp * 1000 < Date.now();
    } catch (e) {
      return true;
    }
  };