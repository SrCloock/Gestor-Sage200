import React, { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import CartItem from '../components/CartItem';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cartItems, total } = useContext(CartContext);
  const navigate = useNavigate();

  return (
    <div className="cart-page">
      <h2>Carrito de compras</h2>
      {cartItems.length === 0 ? (
        <p>No hay productos en el carrito</p>
      ) : (
        <>
          {cartItems.map(item => (
            <CartItem key={item.id} item={item} />
          ))}
          <h3>Total: {total.toFixed(2)}€</h3>
          <button onClick={() => navigate('/nueva-compra')}>Continuar</button>
        </>
      )}
    </div>
  );
};

export default Cart;
