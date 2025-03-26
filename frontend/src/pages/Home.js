import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-page">
      <h1>Bienvenido al Gestor de Compras</h1>
      <Link to="/products" className="btn-primary">
        Ver Catálogo de Productos
      </Link>
    </div>
  );
};

export default Home;