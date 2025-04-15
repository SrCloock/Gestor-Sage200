import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import PedidosList from './components/PedidosList';
import ArticulosList from './components/ArticulosList';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/pedidos" 
              element={
                <PrivateRoute>
                  <PedidosList />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/articulos" 
              element={
                <PrivateRoute>
                  <ArticulosList />
                </PrivateRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/pedidos" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;