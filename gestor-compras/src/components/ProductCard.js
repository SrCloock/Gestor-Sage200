import React, { useState } from 'react';

const ProductCard = ({ product, onAdd }) => {
  const [quantity, setQuantity] = useState(1);

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '5px',
      padding: '1rem',
      margin: '1rem',
      width: '200px'
    }}>
      <h3>{product.name}</h3>
      <p>Precio: {product.price.toFixed(2)}€</p>
      <div>
        <input 
          type="number" 
          min="1" 
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          style={{ width: '50px', marginRight: '10px' }}
        />
        <button onClick={() => onAdd(product, quantity)}>
          Añadir
        </button>
      </div>
    </div>
  );
};

export default ProductCard;