import React from 'react';

const OrderSummary = ({ items, onEdit, onConfirm }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '5px',
      padding: '1rem',
      margin: '1rem 0'
    }}>
      <h3>Resumen del Pedido</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map(item => (
          <li key={item.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            margin: '0.5rem 0'
          }}>
            <span>{item.name}</span>
            <span>{item.quantity} x {item.price.toFixed(2)}€</span>
          </li>
        ))}
      </ul>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: '1rem'
      }}>
        <strong>Total: {total.toFixed(2)}€</strong>
        <div>
          <button onClick={onEdit} style={{ marginRight: '10px' }}>
            Editar
          </button>
          <button onClick={onConfirm}>
            Confirmar Pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;