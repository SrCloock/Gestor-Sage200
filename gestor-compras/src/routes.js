import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Historial from './pages/Historial';
import NuevoPedido from './pages/NuevoPedido';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
      <Route path="/historial" element={user ? <Historial /> : <Navigate to="/login" />} />
      <Route path="/nuevo-pedido" element={user ? <NuevoPedido /> : <Navigate to="/login" />} />
    </Routes>
  );
};

export default AppRoutes;
