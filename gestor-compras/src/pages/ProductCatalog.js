import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaBoxOpen, FaExclamationTriangle, FaSort, FaSpinner } from 'react-icons/fa';
import ProductGrid from '../components/ProductGrid';
import '../styles/ProductCatalog.css';

const PRODUCTS_PER_PAGE = 24;

// Hook de debounce personalizado
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Debounce para búsqueda (300ms)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Generar clave única para productos (optimizada)
  const generateProductKey = useCallback((product) => {
    if (!product) return 'unknown';
    return `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
  }, []);

  // Cargar productos con paginación
  const loadProducts = useCallback(async (page, search, sort) => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const response = await api.get('/api/products', {
        params: {
          page,
          limit: PRODUCTS_PER_PAGE,
          search: search || '',
          sort: 'DescripcionArticulo',
          order: sort
        }
      });

      if (response.data.success) {
        setProducts(response.data.products);
        setTotalPages(response.data.pagination.totalPages);
        setTotalProducts(response.data.pagination.totalProducts);
        setHasMore(response.data.pagination.hasNextPage);
      } else {
        throw new Error(response.data.error || 'Error en la respuesta del servidor');
      }
      
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.response?.data?.error || err.message || 'Error al cargar el catálogo');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Efecto principal para cargar productos
  useEffect(() => {
    if (user) {
      loadProducts(currentPage, debouncedSearchTerm, sortOrder);
    } else {
      navigate('/login');
    }
  }, [currentPage, debouncedSearchTerm, sortOrder, user, navigate, loadProducts]);

  // Manejo de búsqueda
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset a página 1 al buscar
  }, []);

  // Manejo de ordenación
  const handleSortChange = useCallback((e) => {
    setSortOrder(e.target.value);
    setCurrentPage(1);
  }, []);

  // Cambio de página
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  // Añadir producto al pedido
  const handleAddToOrder = useCallback((product) => {
    navigate('/crear-pedido', { 
      state: { selectedProduct: product } 
    });
  }, [navigate]);

  // Reintentar carga
  const handleRetry = useCallback(() => {
    loadProducts(currentPage, searchTerm, sortOrder);
  }, [currentPage, searchTerm, sortOrder, loadProducts]);

  // Memoizar productos para evitar re-renders
  const memoizedProducts = useMemo(() => products, [products]);

  // Loading inicial
  if (loading && products.length === 0) {
    return (
      <div className="pc-loading-container">
        <FaSpinner className="pc-spinner" />
        <p>Cargando catálogo de productos...</p>
      </div>
    );
  }

  return (
    <div className="pc-container">
      {/* Header */}
      <div className="pc-header">
        <h1 className="pc-title">Catálogo de Suministros Dentales</h1>
        <div className="pc-stats">
          <span className="pc-total-products">{totalProducts} productos disponibles</span>
          {searchTerm && (
            <span className="pc-search-results">
              - {products.length} resultados para "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* Panel de controles */}
      <div className="pc-controls-panel">
        <div className="pc-search-container">
          <FaSearch className="pc-search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o proveedor..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pc-search-input"
            aria-label="Buscar productos"
          />
        </div>

        <div className="pc-filters-container">
          <div className="pc-filter-group">
            <FaSort className="pc-filter-icon" />
            <label htmlFor="sort-order" className="pc-filter-label">Ordenar:</label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={handleSortChange}
              className="pc-filter-select"
            >
              <option value="asc">Nombre A-Z</option>
              <option value="desc">Nombre Z-A</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {error ? (
        <div className="pc-error-container">
          <FaExclamationTriangle className="pc-error-icon" />
          <h3>Error al cargar el catálogo</h3>
          <p>{error}</p>
          <button onClick={handleRetry} className="pc-retry-button">
            Reintentar carga
          </button>
        </div>
      ) : (
        <>
          <ProductGrid
            products={memoizedProducts}
            onAddProduct={handleAddToOrder}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            generateProductKey={generateProductKey}
          />

          {/* Estado vacío */}
          {products.length === 0 && !loading && (
            <div className="pc-empty-state">
              <FaBoxOpen className="pc-empty-icon" />
              <h3>No se encontraron productos</h3>
              <p>
                {searchTerm 
                  ? `No hay resultados para "${searchTerm}". Intenta con otros términos.`
                  : 'No hay productos disponibles en este momento.'
                }
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="pc-clear-search-button"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}

          {/* Cargando más */}
          {loading && products.length > 0 && (
            <div className="pc-loading-more">
              <FaSpinner className="pc-small-spinner" />
              <p>Cargando más productos...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(ProductCatalog);