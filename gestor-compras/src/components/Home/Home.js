import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { FaShoppingCart, FaBoxOpen, FaHistory, FaPlusCircle } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-card">
        <h1><FaShoppingCart /> Bienvenido al Gestor de Compras</h1>
        <p className="welcome-message">
          {user?.nombreUsuario && `Hola ${user.nombreUsuario}, `}
          {user?.razonSocial && `de ${user.razonSocial}`}
        </p>
        
        <button 
          className="quick-order-button"
          onClick={() => navigate('/crear-pedido')}
        >
          <FaPlusCircle /> Realizar Pedido
        </button>
        
        <div className="home-section">
          <h2>Acciones rápidas</h2>
          <ul className="home-options">
            <li onClick={() => navigate('/catalogo')}>
              <FaBoxOpen className="icon" /> Catálogo de Productos
            </li>
            <li onClick={() => navigate('/crear-pedido')}>
              <FaShoppingCart className="icon" /> Realizar Pedido
            </li>
            <li onClick={() => navigate('/mis-pedidos')}>
              <FaHistory className="icon" /> Historial de Pedidos
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;