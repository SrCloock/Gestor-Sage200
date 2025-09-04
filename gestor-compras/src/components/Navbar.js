import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaUser, FaPowerOff, FaCaretDown } from 'react-icons/fa';
import '../styles/Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          
          {user?.isAdmin && (
            <li className="nv-link-item">
              <Link to="/admin/orders" className={`nv-link ${isActive('/admin/orders') ? 'nv-active' : ''}`}>
                <span className="nv-icon">👑</span> Administración
              </Link>
            </li>
          )}
        </ul>
      </div>

      <div className="nv-right" ref={dropdownRef}>
        <div 
          className="nv-user-section" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="nv-user-icon">
            <FaUser />
          </div>
          <span className="nv-username">{user?.username || 'Usuario'}</span>
          <FaCaretDown className="nv-caret" />
          
          {dropdownOpen && (
            <div className="nv-dropdown">
              <button className="nv-logout-button" onClick={handleLogout}>
                <FaPowerOff className="nv-logout-icon" /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;