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
        <h1><FaShoppingCart /> Gestor de Ofertas</h1>
        <div className="welcome-container">
          <p className="welcome-message">
            {user?.nombreUsuario && `${user.nombreUsuario}, `}
            {user?.razonSocial && <span className="company-name">{user.razonSocial}</span>}
          </p>
          <p className="integration-badge">Conectado con Sage200</p>
        </div>
        
        <button 
          className="quick-order-button"
          onClick={() => navigate('/crear-pedido')}
        >
          <FaPlusCircle className="button-icon" /> Nueva Oferta
        </button>
        
        <div className="home-section">
          <h2>Acciones Rápidas</h2>
          <ul className="home-options">
            <li onClick={() => navigate('/catalogo')}>
              <FaBoxOpen className="icon" /> 
              <div className="option-content">
                <h3>Catálogo de Productos</h3>
                <p>Productos a ofertar</p>
              </div>
            </li>
            <li onClick={() => navigate('/crear-oferta')}>
              <FaShoppingCart className="icon" />
              <div className="option-content">
                <h3>Gestión de Ofertas</h3>
                <p>Crear y seguir ofertas</p>
              </div>
            </li>
            <li onClick={() => navigate('/mis-pedidos')}>
              <FaHistory className="icon" />
              <div className="option-content">
                <h3>Historial Completo</h3>
                <p>Todos tus movimientos registrados</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;