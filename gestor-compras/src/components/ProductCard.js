// components/ProductCard.js - Versión mejorada
import React from 'react';
import { FaShoppingCart, FaTag, FaUserTie, FaBox } from 'react-icons/fa';
import '../styles/ProductCard.css';

const ProductCard = ({ product, onAddToOrder, showAddButton = true }) => {
  const {
    CodigoArticulo,
    DescripcionArticulo,
    PrecioVenta,
    NombreProveedor,
    PorcentajeIva,
    RutaImagen
  } = product;

  // Función mejorada para manejar errores de imagen
  const handleImageError = (e) => {
    console.log('Error cargando imagen:', RutaImagen);
    e.target.src = '/images/default-product.jpg';
    e.target.onerror = null; // Prevenir bucles
  };

  // Función para construir la URL de la imagen
  const getImageUrl = () => {
    if (!RutaImagen) {
      return '/images/default-product.jpg';
    }
    
    // Si la ruta ya es una URL completa
    if (RutaImagen.startsWith('http')) {
      return RutaImagen;
    }
    
    // Si es una ruta relativa, construir URL completa
    if (RutaImagen.startsWith('/')) {
      return `http://localhost:3000${RutaImagen}`;
    }
    
    return `/images/products/${RutaImagen}`;
  };

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
          src={getImageUrl()}
          alt={DescripcionArticulo}
          onError={handleImageError}
          loading="lazy"
        />
        <div className="product-image-overlay">
          <span className="product-code-badge">{CodigoArticulo}</span>
        </div>
      </div>
      
      <div className="product-info">
        <h3 className="product-name" title={DescripcionArticulo}>
          {DescripcionArticulo}
        </h3>
        
        <div className="product-meta">
          <div className="product-code">
            <FaTag className="meta-icon" />
            <span>Código: {CodigoArticulo}</span>
          </div>
          
          {NombreProveedor && (
            <div className="product-supplier">
              <FaUserTie className="meta-icon" />
              <span>{NombreProveedor}</span>
            </div>
          )}
          
          <div className="product-tax">
            <FaBox className="meta-icon" />
            <span>IVA: {PorcentajeIva}%</span>
          </div>
        </div>
      </div>
      
      <div className="product-footer">
        <div className="product-price-section">
          <div className="product-price">
            {PrecioVenta?.toFixed(2)} €
          </div>
          <div className="product-price-tax">
            IVA incl.
          </div>
        </div>
        
        {showAddButton && (
          <button 
            className="add-to-order-btn"
            onClick={handleAddClick}
            title="Añadir al pedido"
          >
            <FaShoppingCart />
            Añadir
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;