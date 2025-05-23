import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaFileInvoice, FaArrowLeft, FaShoppingCart } from 'react-icons/fa';
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
          <h2><FaFileInvoice /> Confirmación de Pedido</h2>
          <div className="success-icon">
            <FaCheckCircle />
          </div>
        </div>
        
        <div className="review-content">
          <p>
            Su pedido de suministros dentales <strong>#{seriePedido}-{orderId}</strong><br />
            ha sido registrado exitosamente en nuestro sistema.
          </p>
          
          {deliveryDate && (
            <div className="delivery-info">
              <FaCalendarCheck />
              <span>
                <strong>Fecha solicitada:</strong> {new Date(deliveryDate).toLocaleDateString()}
              </span>
            </div>
          )}
          
          <p>
            Recibirá una confirmación por correo electrónico con<br />
            los detalles de su pedido y seguimiento.
          </p>
        </div>
        
        <div className="review-actions">
          <button 
            onClick={() => navigate('/crear-pedido')} 
            className="action-button another-order"
          >
            <FaShoppingCart /> Nuevo Pedido
          </button>
          <button 
            onClick={() => navigate('/mis-pedidos')} 
            className="action-button view-orders"
          >
            <FaArrowLeft /> Ver Historial
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderReview;