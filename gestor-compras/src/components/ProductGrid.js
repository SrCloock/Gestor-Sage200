import React, { memo, useState, useCallback } from 'react';
import { FaArrowLeft, FaArrowRight, FaPlus, FaShoppingCart } from 'react-icons/fa';
import '../styles/ProductGrid.css';

// Componente ProductCard separado para mejor rendimiento
const ProductCard = memo(({ 
  product, 
  productKey, 
  onAddProduct, 
  onImageLoad, 
  loadedImages 
}) => {
  const [imageError, setImageError] = useState(false);
  const imageLoaded = loadedImages.has(productKey);

  // Formatear precio
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Consultar precio';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Manejar clic en producto
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onAddProduct(product);
  }, [onAddProduct, product]);

  // Manejar teclado
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAddProduct(product);
    }
  }, [onAddProduct, product]);

  // Manejar error de imagen
  const handleImageError = useCallback((e) => {
    setImageError(true);
    e.target.src = '/images/default.jpg';
    e.target.className = 'pg-product-image pg-default-image';
  }, []);

  return (
    <article
      className="pg-product-card"
      onClick={handleClick}
      tabIndex={0}
      onKeyPress={handleKeyPress}
      aria-label={`Añadir ${product.DescripcionArticulo} al pedido`}
    >
      <div className="pg-product-image-container">
        {/* Skeleton loading */}
        {!imageLoaded && !imageError && (
          <div className="pg-image-skeleton">
            <div className="pg-skeleton-loader"></div>
          </div>
        )}

        {/* Imagen del producto */}
        <img
          src={product.RutaImagen || '/images/default.jpg'}
          alt={product.DescripcionArticulo}
          className={`pg-product-image ${
            imageLoaded ? 'pg-image-loaded' : 'pg-image-loading'
          } ${imageError ? 'pg-image-error' : ''}`}
          loading="lazy"
          decoding="async"
          onLoad={() => onImageLoad(productKey)}
          onError={handleImageError}
        />

        {/* Overlay de acción */}
        <div className="pg-product-overlay">
          <div className="pg-overlay-content">
            <FaShoppingCart className="pg-add-icon" />
            <span className="pg-add-text">Añadir al Pedido</span>
          </div>
        </div>

        {/* Badge de proveedor */}
        {product.NombreProveedor && (
          <div className="pg-supplier-badge">
            {product.NombreProveedor}
          </div>
        )}
      </div>

      {/* Contenido de la tarjeta */}
      <div className="pg-product-content">
        {/* Header */}
        <div className="pg-product-header">
          <h3 
            className="pg-product-name" 
            title={product.DescripcionArticulo}
          >
            {product.DescripcionArticulo}
          </h3>
          <span className="pg-product-code">
            {product.CodigoArticulo}
          </span>
        </div>

        {/* Precio */}
        <div className="pg-product-price-section">
          <span className="pg-price-label">Precio:</span>
          <span className="pg-price-value">
            {formatPrice(product.PrecioVenta)}
          </span>
        </div>

        {/* Acciones */}
        <div className="pg-product-actions">
          <button 
            className="pg-add-button"
            onClick={handleClick}
            aria-label={`Añadir ${product.DescripcionArticulo} al pedido`}
          >
            <FaPlus className="pg-button-icon" />
            Añadir al Pedido
          </button>
        </div>
      </div>
    </article>
  );
});

// Componente Pagination separado
const Pagination = memo(({ currentPage, totalPages, onPageChange }) => {
  const createPageNumbers = () => {
    if (totalPages <= 1) return [];
    
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

  const pageNumbers = createPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <nav className="pg-pagination" aria-label="Paginación de productos">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pg-pagination-button pg-pagination-prev"
        aria-label="Página anterior"
      >
        <FaArrowLeft />
      </button>

      {pageNumbers.map((page, index) => (
        <button
          key={index}
          onClick={() => page !== '...' && onPageChange(page)}
          className={`pg-pagination-button ${
            currentPage === page ? 'pg-active' : ''
          } ${page === '...' ? 'pg-ellipsis' : ''}`}
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
    </nav>
  );
});

// Componente principal ProductGrid
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

  // Manejar carga de imágenes
  const handleImageLoad = useCallback((productKey) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(productKey);
      return newSet;
    });
  }, []);

  // Manejar clic en producto
  const handleProductClick = useCallback((product, event) => {
    event.preventDefault();
    event.stopPropagation();
    onAddProduct(product);
  }, [onAddProduct]);

  // Memoizar productos para evitar re-renders
  const memoizedProducts = React.useMemo(() => products, [products]);

  return (
    <div className="pg-container">
      {/* Grid de productos */}
      <div className="pg-product-grid">
        {memoizedProducts.map(product => {
          const productKey = generateProductKey(product);
          
          return (
            <ProductCard
              key={productKey}
              product={product}
              productKey={productKey}
              onAddProduct={handleProductClick}
              onImageLoad={handleImageLoad}
              loadedImages={loadedImages}
            />
          );
        })}
      </div>

      {/* Sin resultados */}
      {products.length === 0 && !searchTerm && (
        <div className="pg-no-results">
          <div className="pg-no-results-content">
            <FaShoppingCart className="pg-no-results-icon" />
            <h3>No hay productos disponibles</h3>
            <p>El catálogo está vacío en este momento.</p>
          </div>
        </div>
      )}

      {products.length === 0 && searchTerm && (
        <div className="pg-no-results">
          <div className="pg-no-results-content">
            <FaShoppingCart className="pg-no-results-icon" />
            <h3>No se encontraron resultados</h3>
            <p>No hay productos que coincidan con "{searchTerm}"</p>
          </div>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
});

// Display name para mejor debugging
ProductGrid.displayName = 'ProductGrid';
ProductCard.displayName = 'ProductCard';
Pagination.displayName = 'Pagination';

export default ProductGrid;