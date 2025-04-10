import React from 'react';
import { useStore } from '../context';
import CartItem from '../components/CartItem';
import { useNavigate } from 'react-router-dom';
import '../styles/cart.css';

const Cart = () => {
  const { 
    cart, 
    user, 
    isLoading, 
    error, 
    removeFromCart, 
    updateCartItem, 
    clearCart, 
    createOrder 
  } = useStore();
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const order = await createOrder();
    if (order) {
      navigate(`/order-details/${order.NumeroPedido}`);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (isLoading) return <div className="loading">Procesando...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="cart-container">
      <h2>Tu Carrito de Compras</h2>
      
      {cart.length === 0 ? (
        <div className="empty-cart">
          <p>Tu carrito está vacío</p>
          <button onClick={() => navigate('/products')}>Ver Productos</button>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={() => removeFromCart(item.id)}
                onUpdate={(quantity) => updateCartItem(item.id, quantity)}
              />
            ))}
          </div>
          
          <div className="cart-summary">
            <h3>Resumen del Pedido</h3>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>IVA (21%):</span>
              <span>${(total * 0.21).toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${(total * 1.21).toFixed(2)}</span>
            </div>
            
            <div className="cart-actions">
              <button onClick={clearCart} className="secondary">
                Vaciar Carrito
              </button>
              <button onClick={handleCheckout} disabled={isLoading}>
                {isLoading ? 'Procesando...' : 'Finalizar Compra'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;