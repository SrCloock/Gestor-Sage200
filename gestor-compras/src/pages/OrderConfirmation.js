import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const OrderConfirmation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!state?.items || !state?.user) {
      navigate('/catalog');
    }
  }, [state, navigate]);

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/orders', {
        CodigoCliente: state.user.CodigoCliente,
        items: state.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      });
      
      setOrderDetails(response.data.order);
      alert('Pedido creado exitosamente');
      navigate('/history');
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Error al crear el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!state) return null;

  const total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Confirmación de Pedido</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>Cliente: {state.user.RazonSocial}</h3>
        <p>Código: {state.user.CodigoCliente}</p>
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>Detalles del Pedido</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {state.items.map(item => (
            <li key={item.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              margin: '0.5rem 0',
              padding: '0.5rem',
              borderBottom: '1px solid #eee'
            }}>
              <span>{item.name}</span>
              <span>{item.quantity} x {item.price.toFixed(2)}€</span>
            </li>
          ))}
        </ul>
        <div style={{ textAlign: 'right', marginTop: '1rem' }}>
          <strong>Total: {total.toFixed(2)}€</strong>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/catalog')}>
          Volver a Editar
        </button>
        <button 
          onClick={handleSubmitOrder}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmation;