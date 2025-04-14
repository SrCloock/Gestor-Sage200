import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Bienvenido al Gestor de Compras</h1>
      <Link to="/catalog">
        <button style={{ 
          padding: '10px 20px', 
          fontSize: '1.2rem',
          marginTop: '1rem'
        }}>
          Crear Nuevo Pedido
        </button>
      </Link>
    </div>
  );
};

export default Home;