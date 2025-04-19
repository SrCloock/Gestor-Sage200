import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBoxOpen, FaPlusCircle, FaClipboardList } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <nav className="sidebar">
      <ul>
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
            <FaPlusCircle className="icon" />
            Nuevo Pedido
          </NavLink>
        </li>
        <li>
          <NavLink to="/mis-pedidos" className={({ isActive }) => isActive ? 'active' : ''}>
            <FaClipboardList className="icon" />
            Mis Pedidos
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
