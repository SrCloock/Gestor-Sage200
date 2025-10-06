import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FaUser, 
  FaPowerOff, 
  FaCaretDown, 
  FaHome, 
  FaBox, 
  FaShoppingCart, 
  FaChartBar, 
  FaCrown,
  FaListAlt
} from 'react-icons/fa';
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
        <span className="nv-app-subtitle">Sage200 Integration</span>
      </div>

      <div className="nv-center">
        <ul className="nv-links">
          <li className="nv-link-item">
            <Link to="/" className={`nv-link ${isActive('/') ? 'nv-active' : ''}`}>
              <FaHome className="nv-icon" />
              <span className="nv-link-text">Inicio</span>
            </Link>
          </li>
          <li className="nv-link-item">
            <Link to="/catalogo" className={`nv-link ${isActive('/catalogo') ? 'nv-active' : ''}`}>
              <FaBox className="nv-icon" />
              <span className="nv-link-text">Catálogo</span>
            </Link>
          </li>
          <li className="nv-link-item">
            <Link to="/crear-pedido" className={`nv-link ${isActive('/crear-pedido') ? 'nv-active' : ''}`}>
              <FaShoppingCart className="nv-icon" />
              <span className="nv-link-text">Nuevo Pedido</span>
            </Link>
          </li>
          <li className="nv-link-item">
            <Link to="/mis-pedidos" className={`nv-link ${isActive('/mis-pedidos') ? 'nv-active' : ''}`}>
              <FaChartBar className="nv-icon" />
              <span className="nv-link-text">Historial</span>
            </Link>
          </li>
          
          {user?.isAdmin && (
            <>
              <li className="nv-link-item">
                <Link to="/admin/orders" className={`nv-link ${isActive('/admin/orders') ? 'nv-active' : ''}`}>
                  <FaCrown className="nv-icon" />
                  <span className="nv-link-text">Pendientes</span>
                </Link>
              </li>
              <li className="nv-link-item">
                <Link to="/admin/allOrders" className={`nv-link ${isActive('/admin/all-orders') ? 'nv-active' : ''}`}>
                  <FaListAlt className="nv-icon" />
                  <span className="nv-link-text">Todos los Pedidos</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="nv-right" ref={dropdownRef}>
        <div 
          className="nv-user-section" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="nv-user-avatar">
            <FaUser className="nv-user-icon" />
          </div>
          <div className="nv-user-info">
            <span className="nv-username">{user?.username || 'Usuario'}</span>
            <span className="nv-user-role">{user?.isAdmin ? 'Administrador' : 'Usuario'}</span>
          </div>
          <FaCaretDown className={`nv-caret ${dropdownOpen ? 'nv-caret-up' : ''}`} />
        </div>
        
        {dropdownOpen && (
          <div className="nv-dropdown">
            <div className="nv-dropdown-header">
              <span className="nv-dropdown-username">{user?.username}</span>
              <span className="nv-dropdown-email">{user?.email || user?.username}</span>
              <span className="nv-dropdown-role">{user?.isAdmin ? 'Administrador' : 'Usuario'}</span>
            </div>
            <div className="nv-dropdown-divider"></div>
            <div className="nv-dropdown-divider"></div>
            <button className="nv-logout-button" onClick={handleLogout}>
              <FaPowerOff className="nv-logout-icon" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;