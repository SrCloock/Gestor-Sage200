import React from 'react';
import './Home.css';
import { FaShoppingCart, FaBoxOpen, FaHistory } from 'react-icons/fa';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-card">
        <h1><FaShoppingCart /> Bienvenido al Gestor de Compras</h1>
        <p>Utilice el menú de navegación para acceder a las siguientes secciones:</p>
        <ul className="home-options">
          <li><FaBoxOpen className="icon" /> Catálogo de Productos</li>
          <li><FaShoppingCart className="icon" /> Realizar Pedido</li>
          <li><FaHistory className="icon" /> Historial de Pedidos</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
