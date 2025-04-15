import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Gestor de Pedidos</Link>
      </div>
      {user && (
        <div className="navbar-menu">
          <Link to="/pedidos" className="navbar-item">Mis Pedidos</Link>
          <Link to="/articulos" className="navbar-item">Artículos</Link>
          <button onClick={handleLogout} className="navbar-item logout-button">
            Cerrar Sesión ({user.usuario})
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;