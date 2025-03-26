import React from 'react';
import { useCart } from '../../context/CartContext';
import Button from '../UI/Button';

const CartSummary = () => {
  const { cart, clearCart } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + (item.Precio * item.quantity),
    0
  );

  return (
    <div className="cart-summary">
      <h3>Resumen del Carrito</h3>
      <p>Total Items: {cart.length}</p>
      <p>Total a Pagar: €{total.toFixed(2)}</p>
      <div className="cart-actions">
        <Button onClick={clearCart} danger>
          Vaciar Carrito
        </Button>
        <Button primary>
          Finalizar Compra
        </Button>
      </div>
    </div>
  );
};

export default CartSummary;