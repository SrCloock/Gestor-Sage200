import React, { memo } from 'react';
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

  // Función mejorada para formatear precios
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Consultar precio';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Función optimizada para manejar clics
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
                <img
                  src={product.FinalImage || '/images/default.jpg'}
                  alt={product.DescripcionArticulo}
                  className="pg-product-image"
                  loading="lazy"
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

                {/* Sección de Precio */}
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
    </>
  );
});

export default ProductGrid;