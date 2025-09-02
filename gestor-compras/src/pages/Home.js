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
        <div className="hm-header">
          <h1 className="hm-title">Gestor de Pedidos</h1>
          <div className="hm-welcome-container">
            <p className="hm-welcome-message">
              Bienvenido, <span className="hm-username">{user?.nombreUsuario || 'Usuario'}</span>
            </p>
            {user?.razonSocial && (
              <p className="hm-company-name">{user.razonSocial}</p>
            )}
            <p className="hm-integration-badge">Conectado con Sage200</p>
          </div>
        </div>
        
        <button 
          className="hm-quick-order-button"
          onClick={() => navigate('/crear-pedido')}
        >
          Nuevo Pedido
        </button>
        
        <div className="hm-section">
          <h2 className="hm-section-title">Acciones Rápidas</h2>
          <div className="hm-options">
            <div className="hm-option" onClick={() => navigate('/catalogo')}>
              <div className="hm-icon-container">
                <span className="hm-icon">📦</span>
              </div>
              <div className="hm-option-content">
                <h3>Catálogo</h3>
                <p>Productos disponibles</p>
              </div>
            </div>
            
            <div className="hm-option" onClick={() => navigate('/crear-pedido')}>
              <div className="hm-icon-container">
                <span className="hm-icon">🛒</span>
              </div>
              <div className="hm-option-content">
                <h3>Nuevo Pedido</h3>
                <p>Crear nuevo pedido</p>
              </div>
            </div>
            
            <div className="hm-option" onClick={() => navigate('/mis-pedidos')}>
              <div className="hm-icon-container">
                <span className="hm-icon">📊</span>
              </div>
              <div className="hm-option-content">
                <h3>Historial</h3>
                <p>Tus pedidos anteriores</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;