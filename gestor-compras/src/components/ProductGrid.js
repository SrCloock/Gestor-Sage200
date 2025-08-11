import React, { memo } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
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

  return (
    <>
      <div className="pg-product-grid">
        {products.map(product => (
          <div
            key={generateProductKey(product)}
            className="pg-product-card"
            onClick={() => onAddProduct(product)}
          >
            <div className="pg-product-image-container">
              <img
                src={product.FinalImage || '/images/default.jpg'}
                alt={product.DescripcionArticulo}
                className="pg-product-image"
                onError={(e) => {
                  e.target.src = '/images/default.jpg';
                  e.target.className = 'pg-product-image pg-default-image';
                }}
              />
            </div>

            <div className="pg-product-header">
              <h3 className="pg-product-name">{product.DescripcionArticulo}</h3>
              <span className="pg-product-code">{product.CodigoArticulo}</span>
            </div>

            {product.NombreProveedor && (
              <div className="pg-product-supplier">
                <span>Proveedor:</span> {product.NombreProveedor}
              </div>
            )}

            <div className="pg-product-actions">
              <button className="pg-add-button">
                Añadir al pedido
              </button>
            </div>
          </div>
        ))}
        
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
            className="pg-pagination-button"
          >
            <FaArrowLeft />
          </button>

          {createPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => page !== '...' && onPageChange(page)}
              className={`pg-pagination-button ${currentPage === page ? 'pg-active' : ''}`}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pg-pagination-button"
          >
            <FaArrowRight />
          </button>
        </div>
      )}
    </>
  );
});

export default ProductGrid;