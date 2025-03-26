import React from 'react';
import { useCart } from '../../context/CartContext';
import Button from '../UI/Button';

const CartItem = ({ item }) => {
  const { removeFromCart } = useCart();

  return (
    <div className="cart-item">
      <div className="item-info">
        <h4>{item.NombreArticulo}</h4>
        <p>Código: {item.CodigoArticulo}</p>
        <p>Precio: €{item.Precio.toFixed(2)}</p>
        <p>Cantidad: {item.quantity}</p>
        <p>Total: €{(item.Precio * item.quantity).toFixed(2)}</p>
      </div>
      <Button 
        onClick={() => removeFromCart(item.CodigoArticulo)}
        danger
      >
        Eliminar
      </Button>
    </div>
  );
};

export default CartItem;