import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaBoxOpen, FaHistory, FaHome, FaTruck } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1 className="app-title">Gestor de Compras</h1>
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
          <Link to="/crear-pedido-proveedor" className={location.pathname === '/crear-pedido-proveedor' ? 'active' : ''}>
              <FaTruck className="icon" /> Pedido Proveedor
            </Link>
          <li>
            <Link to="/mis-pedidos" className={location.pathname === '/mis-pedidos' ? 'active' : ''}>
              <FaHistory className="icon" /> Historial
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;