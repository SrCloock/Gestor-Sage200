import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBoxOpen, FaShoppingCart, FaHistory } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1 className="app-title">Gestor de Compras</h1>
        <ul className="navbar-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              <FaHome className="icon" />
              Inicio
            </NavLink>
          </li>
          <li>
            <NavLink to="/catalogo" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaBoxOpen className="icon" />
              Catálogo
            </NavLink>
          </li>
          <li>
            <NavLink to="/crear-pedido" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaShoppingCart className="icon" />
              Realizar Pedido
            </NavLink>
          </li>
          <li>
            <NavLink to="/mis-pedidos" className={({ isActive }) => isActive ? 'active' : ''}>
              <FaHistory className="icon" />
              Historial
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
