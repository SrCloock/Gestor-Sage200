import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Login from './pages/Login';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/pedidos" element={<Orders />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;