import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/">Inicio</Link>
      <Link to="/productos">Productos</Link>
      <Link to="/carrito">Carrito</Link>
      <Link to="/pedidos">Mis Pedidos</Link>
      {user && (
        <div className="user-section">
          <span className="user-name">{user.NombreCompleto}</span>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;