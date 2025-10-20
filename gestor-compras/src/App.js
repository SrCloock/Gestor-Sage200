import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Catalog from './components/Catalog';
import OrderCreate from './pages/OrderCreate';
import OrderReview from './pages/OrderReview';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import OrderEdit from './pages/OrderEdit';
import OrderReception from './pages/OrderReception';
import AdminOrders from './pages/AdminOrders';
import AllOrders from './pages/AllOrders';


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
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/crear-pedido" element={<OrderCreate />} />
              <Route path="/revisar-pedido" element={<OrderReview />} />
              <Route path="/mis-pedidos" element={<OrderList />} />
              <Route path="/mis-pedidos/:orderId" element={<OrderDetail />} />
              <Route path="/editar-pedido/:orderId" element={<OrderEdit />} />
              <Route path="/mis-pedidos/:orderId/recepcion" element={<OrderReception />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/allOrders" element={<AllOrders />} />
            </Route>

            <Route path="*" element={<Login />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;