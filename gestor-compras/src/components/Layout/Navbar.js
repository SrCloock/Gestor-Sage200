// gestor-compras/src/components/Layout/Navbar.js
import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaShoppingCart, FaBoxOpen, FaHistory, FaHome, FaTruck,
  FaUserCircle, FaSignOutAlt, FaFileContract
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-section navbar-left">
        <h1 className="app-title">ClearDent Gestor</h1>
      </div>

      <div className="navbar-section navbar-center">
        <ul className="navbar-links">
          <li>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              <FaHome className="icon" /> Inicio
            </Link>
          </li>
          <li>
            <Link to="/catalogo" className={location.pathname === '/catalogo' ? 'active' : ''}>
              <FaBoxOpen className="icon" /> Catálogo
            </Link>
          </li>
          <li>
            <Link to="/crear-pedido" className={location.pathname === '/crear-pedido' ? 'active' : ''}>
              <FaShoppingCart className="icon" /> Nuevo Pedido
            </Link>
          </li>
          <li>
            <Link to="/crear-oferta" className={location.pathname === '/crear-oferta' ? 'active' : ''}>
              <FaFileContract className="icon" /> Nueva Oferta
            </Link>
          </li>
          <li>
            <Link to="/crear-pedido-proveedor" className={location.pathname === '/crear-pedido-proveedor' ? 'active' : ''}>
              <FaTruck className="icon" /> Proveedores
            </Link>
          </li>
          <li>
            <Link to="/mis-pedidos" className={location.pathname === '/mis-pedidos' ? 'active' : ''}>
              <FaHistory className="icon" /> Historial
            </Link>
          </li>
        </ul>
      </div>

      <div className="navbar-section navbar-right">
        <div className="user-section">
          <FaUserCircle className="user-icon" />
          <span className="username">{user?.nombreUsuario || 'Usuario'}</span>
          <div className="dropdown-menu">
            <button className="logout-button" onClick={handleLogout}>
              <FaSignOutAlt /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;