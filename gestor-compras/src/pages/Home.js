import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => (
  <div className="home-page">
    <h1>Gestor de Compras</h1>
    <Link to="/productos">Ver productos</Link>
  </div>
);

export default Home;
