import React, { useContext } from 'react';
import { CartContext } from '../context/CartContext';

const CartItem = ({ item }) => {
  const { removeFromCart } = useContext(CartContext);

  return (
    <div className="cart-item">
      <p>{item.name} - {item.quantity} x {item.price.toFixed(2)}€</p>
      <button onClick={() => removeFromCart(item.id)}>Eliminar</button>
    </div>
  );
};

export default CartItem;
