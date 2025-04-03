import { useContext, useCallback, useMemo } from "react";
import { StoreContext } from "../context";
import CartItem from "../components/CartItem";
import "../styles/cart.css";

const Cart = () => {
  const { cart, setCart, setOrders } = useContext(StoreContext);

  // Función para calcular el total y la cantidad total de productos
  const calculateCartSummary = useMemo(() => {
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);
    const quantity = cart.reduce((acc, item) => acc + item.quantity, 0);
    return { total, quantity };
  }, [cart]);

  // Función optimizada con useCallback para manejar el checkout
  const checkout = useCallback(() => {
    if (cart.length === 0) return; // Previene la acción si el carrito está vacío

    const order = {
      id: Date.now(),
      items: cart,
      total: calculateCartSummary.total,
      date: new Date().toISOString(),
    };

    // Agregar validación del carrito antes de proceder al checkout
    if (!order.items.every(item => item.price && item.quantity)) {
      alert("Hay un error en los productos del carrito.");
      return;
    }

    setOrders(prevOrders => [...prevOrders, order]);
    setCart([]); // Vaciar el carrito después de completar la compra
  }, [cart, calculateCartSummary.total, setCart, setOrders]);

  // Función para vaciar el carrito
  const clearCart = () => {
    if (window.confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
      setCart([]);
    }
  };

  return (
    <div className="cart-container">
      <h2>Tu Carrito de Compras</h2>
      {cart.length === 0 ? (
        <p>El carrito está vacío.</p>
      ) : (
        cart.map(item => (
          <CartItem key={item.id} item={item} />
        ))
      )}

      <div className="cart-buttons">
        <button
          onClick={clearCart}
          disabled={cart.length === 0}
        >
          Vaciar Carrito
        </button>
        <button
          onClick={checkout}
          disabled={cart.length === 0}
        >
          Finalizar Compra
        </button>
      </div>

      {cart.length > 0 && (
        <div className="cart-summary">
          <p>Total: ${calculateCartSummary.total}</p>
          <p>Cantidad de productos: {calculateCartSummary.quantity}</p>
        </div>
      )}
    </div>
  );
};

export default Cart;
