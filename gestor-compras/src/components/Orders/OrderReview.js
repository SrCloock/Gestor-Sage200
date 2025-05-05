import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './OrderReview.css';

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
    <div className="order-review">
      <div className="review-card">
        <div className="review-header">
          <h2>Pedido Confirmado</h2>
          <div className="success-icon">✓</div>
        </div>
        
        <div className="review-content">
          <p>Tu pedido <strong>#{seriePedido}-{orderId}</strong> ha sido registrado correctamente.</p>
          
          {deliveryDate && (
            <p className="delivery-info">
              <strong>Fecha de entrega solicitada:</strong> {new Date(deliveryDate).toLocaleDateString()}
            </p>
          )}
          
          <p>Recibirás una confirmación por correo electrónico con los detalles.</p>
        </div>
        
        <div className="review-actions">
          <button 
            onClick={() => navigate('/crear-pedido')} 
            className="action-button another-order"
          >
            Hacer otro pedido
          </button>
          <button 
            onClick={() => navigate('/mis-pedidos')} 
            className="action-button view-orders"
          >
            Ver mis pedidos
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderReview;