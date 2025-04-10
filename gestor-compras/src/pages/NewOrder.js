import React, { useState } from 'react';
import { useStore } from '../context';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/newOrder.css';

const NewOrder = () => {
  const { user, cart, clearCart, setError } = useStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || cart.length === 0) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const orderData = {
        CodigoCliente: user.CodigoCliente,
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };
      
      const response = await api.createOrder(orderData);
      
      if (response.data) {
        clearCart();
        navigate(`/order-details/${response.data.NumeroPedido}`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al crear el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-order-container">
      <h2>Confirmar Pedido</h2>
      
      <div className="order-summary">
        <h3>Resumen del Pedido</h3>
        {cart.length === 0 ? (
          <p>No hay productos en el carrito</p>
        ) : (
          <>
            <ul>
              {cart.map(item => (
                <li key={item.id}>
                  {item.name} - {item.quantity} x {item.price.toFixed(2)}€
                </li>
              ))}
            </ul>
            
            <div className="total-section">
              <strong>Total:</strong> 
              {cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}€
            </div>
          </>
        )}
        
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || cart.length === 0}
          className="submit-button"
        >
          {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default NewOrder;