import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div>
      <h1>Bienvenido al Gestor de Compras</h1>
      <p>Gestiona tus pedidos y productos de manera fácil y rápida.</p>
      <Link to="/orders">Ver Pedidos</Link>
      <br />
      <Link to="/products">Ver Productos</Link>
    </div>
  );
};

export default Home;
