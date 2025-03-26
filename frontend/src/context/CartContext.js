import React, { createContext, useState, useContext } from 'react';

// Declaración única del contexto (eliminada la duplicada al final)
const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.CodigoArticulo === product.CodigoArticulo);
      return existing
        ? prev.map(item =>
            item.CodigoArticulo === product.CodigoArticulo
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        : [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.CodigoArticulo !== productId));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
};

// Eliminada la línea duplicada: export const CartContext = createContext();