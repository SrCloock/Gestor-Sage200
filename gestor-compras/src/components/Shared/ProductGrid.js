import React from 'react';
import '../Products/ProductCatalog.css';

const ProductGrid = ({ products, onAddProduct, currentPage, totalPages, onPageChange, searchTerm }) => {
  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor}`;
  };

  const createPageNumbers = () => {
    const pageNumbers = [];
    const maxPage = totalPages;

    if (maxPage <= 5) {
      for (let i = 1; i <= maxPage; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pageNumbers.push(1, 2, 3, '...', maxPage);
      } else if (currentPage >= maxPage - 2) {
        pageNumbers.push(1, '...', maxPage - 2, maxPage - 1, maxPage);
      } else {
        pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', maxPage);
      }
    }

    return pageNumbers;
  };

  return (
    <>
      <div className="pc-product-grid" key={`product-grid-${searchTerm}-${currentPage}`}>
        {products.length > 0 ? (
          products.map(product => (
            <div
              key={`${generateProductKey(product)}-${searchTerm}-${currentPage}`}
              className="pc-product-card"
              onClick={() => onAddProduct(product)}
            >
              <div className="product-image-container">
                <img
                  src={product.FinalImage || '/images/default.jpg'}
                  alt={product.DescripcionArticulo}
                  className="product-image"
                  onError={(e) => {
                    e.target.src = '/images/default.jpg';
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
          ))
        ) : (
          <div className="pc-no-results" style={{ gridColumn: '1 / -1' }}>
            {searchTerm ? `No se encontraron productos para "${searchTerm}"` : 'No hay productos disponibles'}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pc-pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Anterior
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
            Siguiente
          </button>
        </div>
      )}
    </>
  );
};

export default ProductGrid;