import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaBoxOpen, FaShoppingCart, FaChartBar, FaClock, FaHeadset, FaCheckCircle } from 'react-icons/fa';
import '../styles/Home.css';

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: <FaBoxOpen />,
      title: 'Catálogo',
      description: 'Productos disponibles',
      action: () => navigate('/catalogo'),
      color: '#2e7d67'
    },
    {
      icon: <FaShoppingCart />,
      title: 'Nuevo Pedido',
      description: 'Crear nuevo pedido',
      action: () => navigate('/crear-pedido'),
      color: '#4ca788'
    },
    {
      icon: <FaChartBar />,
      title: 'Historial',
      description: 'Tus pedidos anteriores',
      action: () => navigate('/mis-pedidos'),
      color: '#2e7d67'
    }
  ];

  const stats = [
    {
      icon: <FaClock />,
      label: 'Pedidos en preparación',
      value: '3'
    },
    {
      icon: <FaShoppingCart />,
      label: 'Pedidos este mes',
      value: '12'
    },
    {
      icon: <FaHeadset />,
      label: 'Soporte disponible',
      value: '24/7'
    }
  ];

  return (
    <div className="hm-container">
      <div className="hm-content">
        <div className="hm-hero-section">
          <div className="hm-welcome-card">
            <div className="hm-welcome-content">
              <h1 className="hm-welcome-title">
                Bienvenido, <span className="hm-username">{user?.nombreUsuario || 'Usuario'}</span>
              </h1>
              <p className="hm-welcome-subtitle">
                Gestiona tus pedidos de suministros dentales de forma eficiente
              </p>
              {user?.razonSocial && (
                <p className="hm-company-name">{user.razonSocial}</p>
              )}
              <div className="hm-integration-badge">
                <FaCheckCircle className="hm-badge-icon" />
                <span>Conectado con Sage200</span>
              </div>
            </div>
            <div className="hm-hero-illustration">
              <div className="hm-illustration-circle"></div>
              <div className="hm-illustration-box"></div>
            </div>
          </div>
        </div>

        <div className="hm-stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="hm-stat-card">
              <div className="hm-stat-icon" style={{ color: stat.color }}>
                {stat.icon}
              </div>
              <div className="hm-stat-content">
                <span className="hm-stat-value">{stat.value}</span>
                <span className="hm-stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hm-actions-section">
          <div className="hm-section-header">
            <h2 className="hm-section-title">Acciones Rápidas</h2>
            <p className="hm-section-subtitle">Accede rápidamente a las funciones principales</p>
          </div>

          <div className="hm-actions-grid">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="hm-action-card"
                onClick={action.action}
                style={{ '--action-color': action.color }}
              >
                <div className="hm-action-icon">
                  {action.icon}
                </div>
                <div className="hm-action-content">
                  <h3 className="hm-action-title">{action.title}</h3>
                  <p className="hm-action-description">{action.description}</p>
                </div>
                <div className="hm-action-arrow">
                  →
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;