import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './services/api';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          setIsLoading(true);
          setUser(JSON.parse(userData));
          await loadInitialData(JSON.parse(userData).CodigoCliente);
        } catch (err) {
          logout();
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    checkAuth();
  }, []);

  const loadInitialData = async (CodigoCliente) => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.getProducts(),
        api.getOrders(CodigoCliente)
      ]);
      
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const res = await api.loginUser(credentials);
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      
      await loadInitialData(res.data.user.CodigoCliente);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (credentials) => {
    try {
      setIsLoading(true);
      const res = await api.adminLogin(credentials);
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
      setUser({ role: 'admin' });
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
    setOrders([]);
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateCartItem = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const createOrder = async () => {
    if (!user || cart.length === 0) return null;
    
    try {
      setIsLoading(true);
      const orderData = {
        CodigoCliente: user.CodigoCliente,
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };
      
      const res = await api.createOrder(orderData);
      setOrders(prev => [res.data, ...prev]);
      clearCart();
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el pedido');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        user,
        cart,
        orders,
        products,
        isLoading,
        error,
        login,
        adminLogin,
        logout,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        createOrder,
        setError
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore debe usarse dentro de un StoreProvider');
  }
  return context;
};