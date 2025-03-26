import React from 'react';
import Button from '../UI/Button';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="product-card">
      <div className="product-image">
        <img 
          src={`/uploads/${product.CodigoArticulo}.jpg`} 
          alt={product.NombreArticulo}
          onError={(e) => e.target.src = '/placeholder.jpg'}
        />
      </div>
      <div className="product-details">
        <h3>{product.NombreArticulo}</h3>
        <p>Código: {product.CodigoArticulo}</p>
        <p>Proveedor: {product.NombreProveedor}</p>
        <p className="price">€{product.Precio.toFixed(2)}</p>
        <Button 
          onClick={() => onAddToCart(product)}
          primary
        >
          Añadir al Carrito
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;