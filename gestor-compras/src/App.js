import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Historial from './pages/Historial';
import DetallesPedido from './pages/DetallesPedido';
import Navbar from './components/Navbar';

const App = () => {
  const user = JSON.parse(sessionStorage.getItem('user'));

  return (
    <Router>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/historial" element={user ? <Historial /> : <Navigate to="/login" />} />
        <Route path="/detalles" element={user ? <DetallesPedido /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;
