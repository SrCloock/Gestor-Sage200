import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nv-navbar">
      <div className="nv-left">
        <h1 className="nv-app-title">Gestor de Pedidos</h1>
      </div>

      <div className="nv-center">
        <ul className="nv-links">
          <li className="nv-link-item">
            <Link to="/" className={`nv-link ${isActive('/') ? 'nv-active' : ''}`}>
              <span className="nv-icon">🏠</span> Inicio
            </Link>
          </li>
          <li className="nv-link-item">
            <Link to="/catalogo" className={`nv-link ${isActive('/catalogo') ? 'nv-active' : ''}`}>
              <span className="nv-icon">📦</span> Catálogo
            </Link>
          </li>
          <li className="nv-link-item">
            <Link to="/crear-pedido" className={`nv-link ${isActive('/crear-pedido') ? 'nv-active' : ''}`}>
              <span className="nv-icon">🛒</span> Nuevo Pedido
            </Link>
          </li>
          <li className="nv-link-item">
            <Link to="/mis-pedidos" className={`nv-link ${isActive('/mis-pedidos') ? 'nv-active' : ''}`}>
              <span className="nv-icon">📊</span> Historial
            </Link>
          </li>
        </ul>
      </div>

      <div className="nv-right">
        <div className="nv-user-section">
          <div className="nv-user-icon">👤</div>
          <span className="nv-username">{user?.nombreUsuario || 'Usuario'}</span>
          <div className="nv-dropdown">
            <button className="nv-logout-button" onClick={handleLogout}>
              <span className="nv-logout-icon">🚪</span> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;