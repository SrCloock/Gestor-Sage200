import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './OrderReview.css';

const OrderReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId;

  if (!orderId) {
    navigate('/mis-pedidos');
    return null;
  }

  return (
    <div className="order-review">
      <h2>Pedido Confirmado</h2>
      <p>Tu pedido <strong>#{orderId}</strong> ha sido registrado correctamente.</p>
      
      <div className="actions">
        <button onClick={() => navigate('/crear-pedido')}>
          Hacer otro pedido
        </button>
        <button onClick={() => navigate('/mis-pedidos')}>
          Ver mis pedidos
        </button>
      </div>
    </div>
  );
};

export default OrderReview;