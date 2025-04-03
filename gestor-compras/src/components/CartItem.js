import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import "../styles/CartItem.css";

const CartItem = ({ item, onRemove, onUpdateQuantity }) => {
  // Estado para las validaciones
  const [validPrice, setValidPrice] = useState(item.price > 0 ? item.price : 0);
  const [validQuantity, setValidQuantity] = useState(item.quantity > 0 ? item.quantity : 1);

  // Memoriza el precio total solo si hay cambios en la cantidad o el precio
  const totalPrice = useMemo(() => validPrice * validQuantity, [validPrice, validQuantity]);

  // Actualización de cantidad
  const handleQuantityChange = useCallback(
    (operation) => {
      const newQuantity = operation === 'increase' ? validQuantity + 1 : validQuantity - 1;
      if (newQuantity > 0) {
        setValidQuantity(newQuantity);
        onUpdateQuantity(item.id, newQuantity);
      }
    },
    [validQuantity, item.id, onUpdateQuantity]
  );

  // Eliminar el artículo
  const handleRemove = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  return (
    <div className="cart-item">
      <h3 className="name">{item.name}</h3>
      <p className="details">
        ${validPrice.toFixed(2)} x {validQuantity} = ${totalPrice.toFixed(2)}
      </p>
      <div className="actions">
        <button
          onClick={() => handleQuantityChange('decrease')}
          className={`button ${validQuantity <= 1 ? 'buttonDisabled' : ''}`}
          aria-label="Reducir cantidad"
          disabled={validQuantity <= 1}
        >
          -
        </button>
        <span className="quantity" aria-live="polite">
          {validQuantity}
        </span>
        <button
          onClick={() => handleQuantityChange('increase')}
          className="button"
          aria-label="Aumentar cantidad"
        >
          +
        </button>
        <button
          onClick={handleRemove}
          className="removeButton"
          aria-label="Eliminar artículo"
          role="alert"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

// PropTypes para asegurar la validez de los datos
CartItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    quantity: PropTypes.number.isRequired,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func.isRequired,
};

// Usamos React.memo para evitar re-renderizados innecesarios
export default React.memo(CartItem);
