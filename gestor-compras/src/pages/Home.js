import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Home.css';

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="hm-container">
      <div className="hm-card">
        <h1 className="hm-title">Gestor de Pedidos</h1>
        <div className="hm-welcome-container">
          <p className="hm-welcome-message">
            {user?.nombreUsuario && `${user.nombreUsuario}, `}
            {user?.razonSocial && <span className="hm-company-name">{user.razonSocial}</span>}
          </p>
          <p className="hm-integration-badge">Conectado con Sage200</p>
        </div>
        
        <button 
          className="hm-quick-order-button"
          onClick={() => navigate('/crear-pedido')}
        >
          Nuevo Pedido
        </button>
        
        <div className="hm-section">
          <h2 className="hm-section-title">Acciones Rápidas</h2>
          <ul className="hm-options">
            <li className="hm-option" onClick={() => navigate('/catalogo')}>
              <div className="hm-icon-container">
                <span className="hm-icon">📦</span>
              </div>
              <div className="hm-option-content">
                <h3>Catálogo de Productos</h3>
                <p>Productos disponibles</p>
              </div>
            </li>
            <li className="hm-option" onClick={() => navigate('/crear-pedido')}>
              <div className="hm-icon-container">
                <span className="hm-icon">🛒</span>
              </div>
              <div className="hm-option-content">
                <h3>Gestión de Pedidos</h3>
                <p>Crear y seguir pedidos</p>
              </div>
            </li>
            <li className="hm-option" onClick={() => navigate('/mis-pedidos')}>
              <div className="hm-icon-container">
                <span className="hm-icon">📊</span>
              </div>
              <div className="hm-option-content">
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