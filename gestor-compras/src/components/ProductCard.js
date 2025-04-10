import React from 'react';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>Proveedor: {product.supplier}</p>
      <p>Precio: {product.price.toFixed(2)} €</p>
      <button onClick={() => onAddToCart(product)}>Añadir al carrito</button>
    </div>
  );
};

export default ProductCard;