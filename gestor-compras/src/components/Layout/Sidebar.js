import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <nav className="sidebar">
      <ul>
        <li>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            Inicio
          </NavLink>
        </li>
        <li>
          <NavLink to="/catalogo" className={({ isActive }) => isActive ? 'active' : ''}>
            Catálogo
          </NavLink>
        </li>
        <li>
          <NavLink to="/crear-pedido" className={({ isActive }) => isActive ? 'active' : ''}>
            Nuevo Pedido
          </NavLink>
        </li>
        <li>
          <NavLink to="/mis-pedidos" className={({ isActive }) => isActive ? 'active' : ''}>
            Mis Pedidos
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;