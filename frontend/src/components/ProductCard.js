// Archivo: ProductCard.js
import React from 'react';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="product-card">
      <img 
        src={`/uploads/${product.Codigo}.jpg`} 
        alt={product.Nombre}
        onError={(e) => e.target.src = '/placeholder.jpg'}
      />
      <h3>{product.Nombre}</h3>
      <p>Proveedor: {product.Proveedor}</p>
      <p>Precio: {product.Precio} €</p>
      <button onClick={() => onAddToCart(product)}>
        Añadir al carrito
      </button>
    </div>
  );
};