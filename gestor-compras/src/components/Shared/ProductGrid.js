import React from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import '../Products/ProductCatalog.css';

const ProductGrid = ({ 
  products, 
  onAddProduct, 
  currentPage, 
  totalPages, 
  onPageChange, 
  searchTerm,
  generateProductKey = (product) => {
    const str = `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit entero
    }
    return hash.toString(36);
  }
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
      <div className="pc-product-grid">
        {products.map(product => (
          <div
            key={generateProductKey(product)}
            className="pc-product-card"
            onClick={() => onAddProduct(product)}
          >
            <div className="product-image-container">
              <img
                src={product.FinalImage}
                alt={product.DescripcionArticulo}
                className="product-image"
                onError={(e) => {
                  e.target.src = '/images/default.jpg';
                  e.target.className = 'product-image default-product-image';
                }}
              />
            </div>

            <div className="product-header">
              <h3>{product.DescripcionArticulo}</h3>
              <span className="product-code">{product.CodigoArticulo}</span>
            </div>

            {product.NombreProveedor && (
              <div className="product-supplier">
                <span>Proveedor:</span> {product.NombreProveedor}
              </div>
            )}

            <div className="product-actions">
              <button className="add-button">
                Añadir al pedido
              </button>
            </div>
          </div>
        ))}
        
        {products.length === 0 && (
          <div className="pc-no-results">
            {searchTerm 
              ? `No se encontraron resultados para "${searchTerm}"`
              : 'No hay productos disponibles en este momento'}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pc-pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FaArrowLeft />
          </button>

          {createPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => page !== '...' && onPageChange(page)}
              className={currentPage === page ? 'pc-active' : ''}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <FaArrowRight />
          </button>
        </div>
      )}
    </>
  );
};

export default ProductGrid;