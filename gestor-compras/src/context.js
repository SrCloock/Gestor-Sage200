import { createContext, useState, useEffect } from "react";

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = () => {
      const adminCredentials = localStorage.getItem('adminCredentials');
      const sageToken = localStorage.getItem('sageToken');
      setIsAuthenticated(!!adminCredentials || !!sageToken);
    };
    checkAuth();
  }, []);

  const login = (token, isAdmin = false) => {
    if (isAdmin) {
      localStorage.setItem('adminCredentials', token);
    } else {
      localStorage.setItem('sageToken', token);
    }
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('adminCredentials');
    localStorage.removeItem('sageToken');
    setIsAuthenticated(false);
  };

  return (
    <StoreContext.Provider 
      value={{
        cart,
        setCart,
        orders,
        setOrders,
        isAuthenticated,
        login,
        logout
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};