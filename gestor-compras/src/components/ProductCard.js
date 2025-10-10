// components/ProductCard.js
import React from 'react';
import { FaShoppingCart, FaTag, FaUserTie } from 'react-icons/fa';
import '../styles/ProductCard.css';

const ProductCard = ({ product, onAddToOrder }) => {
  const {
    CodigoArticulo,
    DescripcionArticulo,
    PrecioVenta,
    NombreProveedor,
    PorcentajeIva,
    RutaImagen
  } = product;

  const handleAddClick = () => {
    onAddToOrder({
      ...product,
      Cantidad: 1
    });
  };

  return (
    <div className="product-card">
      <div className="product-image">
        <img 
          src={RutaImagen} 
          alt={DescripcionArticulo}
          onError={(e) => {
            e.target.src = '/images/default-product.png';
          }}
        />
      </div>
      
      <div className="product-info">
        <h3 className="product-name" title={DescripcionArticulo}>
          {DescripcionArticulo}
        </h3>
        
        <div className="product-code">
          <FaTag className="code-icon" />
          <span>Código: {CodigoArticulo}</span>
        </div>
        
        {NombreProveedor && (
          <div className="product-supplier">
            <FaUserTie className="supplier-icon" />
            <span>{NombreProveedor}</span>
          </div>
        )}
        
        <div className="product-tax">
          <span>IVA: {PorcentajeIva}%</span>
        </div>
      </div>
      
      <div className="product-footer">
        <div className="product-price">
          {PrecioVenta.toFixed(2)} €
        </div>
        
        <button 
          className="add-to-order-btn"
          onClick={handleAddClick}
          title="Añadir al pedido"
        >
          <FaShoppingCart />
          Añadir
        </button>
      </div>
    </div>
  );
};

export default ProductCard;