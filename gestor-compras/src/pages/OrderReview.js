import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaCalendarCheck, FaFileInvoice, FaArrowLeft, FaShoppingCart } from 'react-icons/fa';
import '../styles/OrderReview.css';

const OrderReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId;
  const seriePedido = location.state?.seriePedido;
  const deliveryDate = location.state?.deliveryDate;

  if (!orderId) {
    navigate('/mis-pedidos');
    return null;
  }

  return (
    <div className="orw-container">
      <div className="orw-card">
        <div className="orw-header">
          <div className="orw-icon-container">
            <FaFileInvoice className="orw-main-icon" />
          </div>
          <h2 className="orw-title">Confirmación de Pedido</h2>
          <div className="orw-success-icon">
            <FaCheckCircle />
          </div>
        </div>
        
        <div className="orw-content">
          <p className="orw-message">
            Su pedido de suministros dentales <strong>#{seriePedido}-{orderId}</strong><br />
            ha sido registrado exitosamente en nuestro sistema.
          </p>
          
          {deliveryDate && (
            <div className="orw-delivery-info">
              <FaCalendarCheck className="orw-delivery-icon" />
              <div className="orw-delivery-content">
                <span className="orw-delivery-label">Fecha solicitada:</span>
                <span className="orw-delivery-date">{new Date(deliveryDate).toLocaleDateString()}</span>
              </div>
            </div>
          )}
          
          <p className="orw-confirmation-message">
            Recibirá una confirmación por correo electrónico con<br />
            los detalles de su pedido y seguimiento.
          </p>
        </div>
        
        <div className="orw-actions">
          <button 
            onClick={() => navigate('/crear-pedido')} 
            className="orw-button orw-primary-button"
          >
            <FaShoppingCart className="orw-button-icon" />
            Nuevo Pedido
          </button>
          <button 
            onClick={() => navigate('/mis-pedidos')} 
            className="orw-button orw-secondary-button"
          >
            <FaArrowLeft className="orw-button-icon" />
            Ver Historial
          </button>
        </div>

        <div className="orw-footer">
          <p className="orw-footer-text">
            ¿Necesita ayuda? <a href="#" className="orw-footer-link">Contacte con soporte</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderReview;