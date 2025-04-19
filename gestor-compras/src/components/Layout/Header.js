import React from 'react';
import './Header.css';
import { FaUserCircle } from 'react-icons/fa';

function Header() {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">Gestor de Compras</h1>
      </div>
      <div className="header-right">
        <FaUserCircle className="user-icon" />
        <span className="user-name">Cliente Empresa</span>
      </div>
    </header>
  );
}

export default Header;
