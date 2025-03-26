import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { cart } = useCart();

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/">Gestor Compras</Link>
      </div>
      <div className="nav-links">
        <Link to="/products">Productos</Link>
        <Link to="/cart">
          Carrito ({cart.reduce((total, item) => total + item.quantity, 0)})
        </Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/admin">Admin</Link>
      </div>
    </nav>
  );
};

export default Navbar;