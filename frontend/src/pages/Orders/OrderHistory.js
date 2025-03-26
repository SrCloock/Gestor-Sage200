import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';

const OrderHistory = () => {
  const { cart } = useCart(); // Cambio clave aquí
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'USUARIO_ACTUAL',
          items: cart
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al procesar el pedido');
      }
      
      // Manejar respuesta exitosa
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="order-page">
      <h2>Historial de Pedidos</h2>
      {cart.length === 0 ? (
        <p>No hay pedidos recientes</p>
      ) : (
        <>
          {cart.map(item => (
            <div key={item.CodigoArticulo} className="order-item">
              <span>{item.NombreArticulo} x {item.quantity}</span>
              <span>{(item.Precio * item.quantity).toFixed(2)}€</span>
            </div>
          ))}
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || cart.length === 0}
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
          </button>
        </>
      )}
    </div>
  );
};

export default OrderHistory;