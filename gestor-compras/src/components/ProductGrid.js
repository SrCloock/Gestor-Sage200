import React, { memo, useState, useCallback } from 'react';
import { FaArrowLeft, FaArrowRight, FaPlus } from 'react-icons/fa';
import '../styles/ProductGrid.css';

const ProductGrid = memo(({ 
  products, 
  onAddProduct, 
  currentPage, 
  totalPages, 
  onPageChange, 
  searchTerm,
  generateProductKey
}) => {
  const [loadedImages, setLoadedImages] = useState(new Set());

  const handleImageLoad = useCallback((productKey) => {
    setLoadedImages(prev => new Set(prev).add(productKey));
  }, []);

  const createPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else if (currentPage <= 3) {
      pageNumbers.push(1, 2, 3, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
    } else {
      pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    
    return pageNumbers;
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Consultar precio';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const handleProductClick = (product, event) => {
    event.preventDefault();
    event.stopPropagation();
    onAddProduct(product);
  };

  return (
    <>
      <div className="pg-product-grid">
        {products.map(product => {
          const productKey = generateProductKey(product);
          const imageLoaded = loadedImages.has(productKey);

          return (
            <div
              key={productKey}
              className="pg-product-card"
              onClick={(e) => handleProductClick(product, e)}
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProductClick(product, e);
                }
              }}
            >
              <div className="pg-product-image-container">
                {!imageLoaded && (
                  <div className="pg-image-skeleton">
                    <div className="pg-skeleton-loader"></div>
                  </div>
                )}
                <img
                  src={product.RutaImagen || '/images/default.jpg'}
                  alt={product.DescripcionArticulo}
                  className={`pg-product-image ${imageLoaded ? 'pg-image-loaded' : 'pg-image-loading'}`}
                  loading="lazy"
                  onLoad={() => handleImageLoad(productKey)}
                  onError={(e) => {
                    e.target.src = '/images/default.jpg';
                    e.target.className = 'pg-product-image pg-default-image';
                  }}
                />
                <div className="pg-product-overlay">
                  <FaPlus className="pg-add-icon" />
                  <span className="pg-add-text">Añadir</span>
                </div>
              </div>

              <div className="pg-product-content">
                <div className="pg-product-header">
                  <h3 className="pg-product-name" title={product.DescripcionArticulo}>
                    {product.DescripcionArticulo}
                  </h3>
                  <span className="pg-product-code">{product.CodigoArticulo}</span>
                </div>

                <div className="pg-product-price-section">
                  <span className="pg-price-label">Precio:</span>
                  <span className="pg-price-value">
                    {formatPrice(product.PrecioVenta || product.PrecioCompra)}
                  </span>
                </div>

                {product.NombreProveedor && (
                  <div className="pg-product-supplier">
                    <span className="pg-supplier-label">Proveedor:</span>
                    <span className="pg-supplier-value">{product.NombreProveedor}</span>
                  </div>
                )}

                <div className="pg-product-actions">
                  <button 
                    className="pg-add-button"
                    onClick={(e) => handleProductClick(product, e)}
                  >
                    Añadir al pedido
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {products.length === 0 && (
          <div className="pg-no-results">
            {searchTerm 
              ? `No se encontraron resultados para "${searchTerm}"`
              : 'No hay productos disponibles en este momento'}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pg-pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pg-pagination-button pg-pagination-prev"
          >
            <FaArrowLeft />
          </button>

          {createPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => page !== '...' && onPageChange(page)}
              className={`pg-pagination-button ${currentPage === page ? 'pg-active' : ''} ${page === '...' ? 'pg-ellipsis' : ''}`}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pg-pagination-button pg-pagination-next"
          >
            <FaArrowRight />
          </button>
        </div>
      )}
    </>
  );
});

export default ProductGrid;