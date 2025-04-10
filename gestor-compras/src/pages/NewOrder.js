import React, { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/newOrder.css';

const NewOrder = () => {
  const { cartItems, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    const { id: CodigoCliente } = JSON.parse(atob(token.split('.')[1]));

    try {
      await axios.post(
        '/api/orders',
        {
          CodigoCliente,
          items: cartItems.map(item => ({
            CodigoArticulo: item.id,
            Cantidad: item.quantity,
            Precio: item.price
          })),
          Estado: 'Pendiente'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      clearCart();
      navigate('/pedidos');
    } catch (err) {
      alert('Error al crear el pedido');
    }
  };

  return (
    <div className="new-order-container">
      <h2>Resumen del pedido</h2>
      <div className="order-items">
        {cartItems.map(item => (
          <div key={item.id} className="order-item">
            <p>{item.name} - {item.quantity} x {item.price.toFixed(2)}€</p>
          </div>
        ))}
      </div>
      <h3>Total: {total.toFixed(2)}€</h3>
      <button onClick={handleSubmit}>Confirmar pedido</button>
    </div>
  );
};

export default NewOrder;