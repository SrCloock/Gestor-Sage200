import React, { useState } from 'react'; // Importación única de React
import { useCart } from '../../context/CartContext';
import CartItem from '../../components/Cart/CartItem';
import CartSummary from '../../components/Cart/CartSummary';
import { createOrder } from '../../services/productService';
import { useNavigate } from 'react-router-dom';
import Notification from '../../components/UI/Notification';

const CartPage = () => {
  const { cart, clearCart } = useCart();
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    try {
      await createOrder({
        items: cart,
        date: new Date().toISOString()
      });
      clearCart();
      setNotification({
        type: 'success',
        message: 'Pedido realizado con éxito!'
      });
      setTimeout(() => navigate('/orders'), 2000);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Error al realizar el pedido'
      });
    }
  };

  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Tu carrito está vacío</h2>
        <button onClick={() => navigate('/products')}>Ir a Productos</button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h2>Tu Carrito de Compras</h2>
      
      {notification && (
        <Notification 
          type={notification.type} 
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="cart-items">
        {cart.map(item => (
          <CartItem key={item.CodigoArticulo} item={item} />
        ))}
      </div>

      <CartSummary onCheckout={handleCheckout} />
    </div>
  );
};

export default CartPage;