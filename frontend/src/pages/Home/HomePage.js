import React from 'react';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-container">
      <div className="welcome-card">
        <h1>Bienvenido al Gestor de Compras</h1>
        <p>Gestiona tus productos, pedidos y proveedores en un solo lugar</p>
        
        <div className="quick-stats">
          <div className="stat-card">
            <h3>Total Productos</h3>
            <p>1,245</p>
          </div>
          <div className="stat-card">
            <h3>Pedidos Hoy</h3>
            <p>24</p>
          </div>
          <div className="stat-card">
            <h3>Proveedores</h3>
            <p>15</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;