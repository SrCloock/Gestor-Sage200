// components/ProductCard.js - Versión mejorada
import React from 'react';
import { FaShoppingCart, FaTag, FaUserTie } from 'react-icons/fa';
import '../styles/ProductCard.css';

const ProductCard = ({ product, onAddToOrder, showAddButton = true }) => {
  const {
    CodigoArticulo,
    DescripcionArticulo,
    PrecioVenta,
    NombreProveedor,
    RutaImagen
  } = product;

  // Función mejorada para manejar errores de imagen
  const handleImageError = (e) => {
    console.warn('Error cargando imagen:', RutaImagen);
    e.target.src = '/images/default-product.jpg';
    e.target.onerror = null; // Prevenir bucles
  };

  // 🖼️ Construir la URL de la imagen correctamente
  const getImageUrl = () => {
    if (!RutaImagen) return '/images/default-product.jpg';

    // Si ya es URL completa (http o https)
    if (RutaImagen.startsWith('http')) return RutaImagen;

    // ✅ Usar variable de entorno o fallback a /api
    const baseURL = process.env.REACT_APP_API_URL || '/api';

    // Si empieza con "/", ejemplo "/images/product.jpg"
    if (RutaImagen.startsWith('/')) {
      return `${baseURL}${RutaImagen}`;
    }

    // Si es solo el nombre de la imagen (ruta relativa en BD)
    return `${baseURL}/images/products/${RutaImagen}`;
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
