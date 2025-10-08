import React, { memo, useState, useCallback } from 'react';
import { FaArrowLeft, FaArrowRight, FaPlus, FaBox, FaExpand, FaInfoCircle } from 'react-icons/fa';
import '../styles/ProductGrid.css';

const ProductGrid = memo(({ 
  products, 
  onAddProduct, 
  currentPage, 
  totalPages, 
  onPageChange, 
  searchTerm,
  generateProductKey,
  loading = false
}) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [imageErrors, setImageErrors] = useState(new Set());
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPriceDetails, setShowPriceDetails] = useState(null);

  const handleImageLoad = useCallback((productKey) => {
    setLoadedImages(prev => new Set(prev).add(productKey));
  }, []);

  const handleImageError = useCallback((productKey) => {
    setImageErrors(prev => new Set(prev).add(productKey));
  }, []);

  const showFullDescription = (product, e) => {
    e.stopPropagation();
    setSelectedProduct(product);
  };

  const togglePriceDetails = (productKey, e) => {
    e.stopPropagation();
    setShowPriceDetails(showPriceDetails === productKey ? null : productKey);
  };

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

  if (loading) {
    return (
      <div className="pg-loading-container">
        <div className="pg-spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="pg-product-grid">
        {products.map(product => {
          const productKey = generateProductKey(product);
          const imageLoaded = loadedImages.has(productKey);
          const imageError = imageErrors.has(productKey);
          const precioConIva = product.PrecioVenta || product.Precio || 0;
          const porcentajeIva = product.PorcentajeIva || 21;
          const precioSinIva = product.PrecioSinIva || (precioConIva / (1 + (porcentajeIva / 100)));

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
                {!imageLoaded && !imageError && (
                  <div className="pg-image-skeleton">
                    <div className="pg-skeleton-loader"></div>
                  </div>
                )}
                <img
                  src={imageError ? '/images/default.jpg' : (product.RutaImagen || '/images/default.jpg')}
                  alt={product.DescripcionArticulo}
                  className={`pg-product-image ${imageLoaded ? 'pg-image-loaded' : 'pg-image-loading'} ${imageError ? 'pg-image-error' : ''}`}
                  loading="lazy"
                  onLoad={() => handleImageLoad(productKey)}
                  onError={() => handleImageError(productKey)}
                />
                <div className="pg-product-overlay">
                  <FaPlus className="pg-add-icon" />
                  <span className="pg-add-text">Añadir al pedido</span>
                </div>
              </div>

              <div className="pg-product-content">
                <div className="pg-product-header">
                  <h3 
                    className="pg-product-name" 
                    onClick={(e) => showFullDescription(product, e)}
                    title="Click para ver descripción completa"
                  >
                    {product.DescripcionArticulo.length > 50 
                      ? `${product.DescripcionArticulo.substring(0, 50)}...` 
                      : product.DescripcionArticulo
                    }
                    {product.DescripcionArticulo.length > 50 && (
                      <FaExpand className="pg-expand-icon" />
                    )}
                  </h3>
                  <span className="pg-product-code">{product.CodigoArticulo}</span>
                </div>

                <div className="pg-product-details">
                  <div className="pg-product-price-section">
                    <span className="pg-price-label">Precio:</span>
                    <div className="pg-price-container">
                      <span className="pg-price-value">
                        {formatPrice(precioConIva)}
                      </span>
                    </div>
                  </div>

                  {product.NombreProveedor && (
                    <div className="pg-product-supplier">
                      <span className="pg-supplier-label">Proveedor:</span>
                      <span className="pg-supplier-value">{product.NombreProveedor}</span>
                    </div>
                  )}

                  {product.Familia && (
                    <div className="pg-product-family">
                      <span className="pg-family-label">Familia:</span>
                      <span className="pg-family-value">{product.Familia}</span>
                    </div>
                  )}

                  {product.Subfamilia && (
                    <div className="pg-product-subfamily">
                      <span className="pg-subfamily-label">Subfamilia:</span>
                      <span className="pg-subfamily-value">{product.Subfamilia}</span>
                    </div>
                  )}
                </div>

                <div className="pg-product-actions">
                  <button 
                    className="pg-add-button"
                    onClick={(e) => handleProductClick(product, e)}
                  >
                    <FaPlus className="pg-add-button-icon" />
                    Añadir al pedido
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {products.length === 0 && (
          <div className="pg-no-results">
            <FaBox className="pg-no-results-icon" />
            <h3>No se encontraron productos</h3>
            <p>
              {searchTerm 
                ? `No hay resultados para "${searchTerm}"`
                : 'No hay productos disponibles en este momento'
              }
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && products.length > 0 && (
        <div className="pg-pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pg-pagination-button pg-pagination-prev"
            aria-label="Página anterior"
          >
            <FaArrowLeft />
          </button>

          {createPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => page !== '...' && onPageChange(page)}
              className={`pg-pagination-button ${currentPage === page ? 'pg-active' : ''} ${page === '...' ? 'pg-ellipsis' : ''}`}
              disabled={page === '...'}
              aria-label={page === '...' ? 'Más páginas' : `Ir a página ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pg-pagination-button pg-pagination-next"
            aria-label="Página siguiente"
          >
            <FaArrowRight />
          </button>
        </div>
      )}

      {/* Modal para descripción completa */}
      {selectedProduct && (
        <div className="pg-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="pg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pg-modal-header">
              <h3>Descripción Completa</h3>
              <button className="pg-modal-close" onClick={() => setSelectedProduct(null)}>×</button>
            </div>
            <div className="pg-modal-body">
              <p><strong>Artículo:</strong> {selectedProduct.DescripcionArticulo}</p>
              <p><strong>Código:</strong> {selectedProduct.CodigoArticulo}</p>
              {selectedProduct.NombreProveedor && (
                <p><strong>Proveedor:</strong> {selectedProduct.NombreProveedor}</p>
              )}
              {selectedProduct.Familia && (
                <p><strong>Familia:</strong> {selectedProduct.Familia}</p>
              )}
              {selectedProduct.Subfamilia && (
                <p><strong>Subfamilia:</strong> {selectedProduct.Subfamilia}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ProductGrid;