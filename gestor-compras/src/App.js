import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Auth/Login';
import Home from './components/Home/Home';
import ProductCatalog from './components/Products/ProductCatalog';
import OrderCreate from './components/Orders/OrderCreate';
import OrderReview from './components/Orders/OrderReview';
import OrderList from './components/Orders/OrderList';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<ProductCatalog />} />
            <Route path="/crear-pedido" element={<OrderCreate />} />
            <Route path="/revisar-pedido" element={<OrderReview />} />
            <Route path="/mis-pedidos" element={<OrderList />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Login />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;