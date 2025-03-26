// Archivo: OrderPage.js
import React, { useContext, useState } from 'react';
import { CartContext } from '../context/CartContext';

const OrderPage = () => {
  const { cart } = useContext(CartContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'USUARIO_ACTUAL', // Reemplazar con JWT luego
        items: cart
      })
    });
    // Manejar respuesta...
  };

  return (
    <div className="order-page">
      <h2>Resumen de Pedido</h2>
      {cart.map(item => (
        <div key={item.Codigo} className="order-item">
          <span>{item.Nombre} x {item.quantity}</span>
          <span>{(item.Precio * item.quantity).toFixed(2)}€</span>
        </div>
      ))}
      <button 
        onClick={handleSubmit}
        disabled={isSubmitting || cart.length === 0}
      >
        {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
      </button>
    </div>
  );
};