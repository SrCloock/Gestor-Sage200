import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Auth/Login';
import Home from './components/Home/Home';
import ProductCatalog from './components/Products/ProductCatalog';
import OrderCreate from './components/Orders/OrderCreate';
import OrderReview from './components/Orders/OrderReview';
import OrderList from './components/Orders/OrderList';
import OrderDetail from './components/Orders/OrderDetail';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import { AuthProvider } from './context/AuthContext';
import OrderEdit from './components/Orders/OrderEdit';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/catalogo" element={<ProductCatalog />} />
              <Route path="/crear-pedido" element={<OrderCreate />} />
              <Route path="/revisar-pedido" element={<OrderReview />} />
              <Route path="/mis-pedidos" element={<OrderList />} />
              <Route path="/mis-pedidos/:orderId" element={<OrderDetail />} />
              <Route path="/editar-pedido/:orderId" element={<OrderEdit />} />
            </Route>

            <Route path="*" element={<Login />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;