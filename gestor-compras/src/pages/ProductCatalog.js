import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaBoxOpen, FaSync } from 'react-icons/fa';
import ProductGrid from '../components/ProductGrid';
import '../styles/ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const productsPerPage = 40; // Aumentar productos por página

  // Debounce para búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const generateProductKey = useCallback((product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
  }, []);

  // Función optimizada para cargar productos
  const loadProducts = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/api/products', {
        params: {
          page,
          limit: productsPerPage,
          search: search.trim()
        }
      });

      if (response.data.products) {
        setProducts(response.data.products);
        setTotalPages(response.data.pagination.totalPages);
        setTotalProducts(response.data.pagination.total);
        setCurrentPage(response.data.pagination.currentPage);
      } else {
        // Fallback para respuesta antigua
        setProducts(response.data);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, [productsPerPage]);

  // Cargar productos cuando cambia el término de búsqueda o la página
  useEffect(() => {
    loadProducts(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, loadProducts]);

  // Cambiar de página
  const handlePageChange = useCallback((newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadProducts(newPage, debouncedSearchTerm);
    }
  }, [totalPages, debouncedSearchTerm, loadProducts]);

  const handleAddToOrder = useCallback((product) => {
    navigate('/crear-pedido', { 
      state: { selectedProduct: product },
      replace: true // Evita guardar en historial de navegación
    });
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    loadProducts(currentPage, debouncedSearchTerm);
  }, [currentPage, debouncedSearchTerm, loadProducts]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo);
    });
  }, [products, sortOrder]);

  if (loading && products.length === 0) {
    return (
      <div className="pc-loading-container">
        <div className="pc-spinner"></div>
        <p>Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="pc-container">
      <div className="pc-header">
        <div className="pc-title-section">
          <h2 className="pc-title">Catálogo de Suministros Dentales</h2>
          <p className="pc-subtitle">
            {totalProducts > 0 ? `${totalProducts} productos disponibles` : 'Buscando productos...'}
            {debouncedSearchTerm && ` - Filtro: "${debouncedSearchTerm}"`}
          </p>
        </div>
        <button onClick={handleRefresh} className="pc-refresh-btn" title="Actualizar">
          <FaSync className={loading ? 'pc-refreshing' : ''} />
        </button>
      </div>

      <div className="pc-controls-panel">
        <div className="pc-search-container">
          <input
            type="text"
            placeholder="Buscar instrumental y suministros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pc-search-input"
          />
          <FaSearch className="pc-search-icon" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="pc-clear-search"
              title="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        <div className="pc-filter-container">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="pc-filter-select"
          >
            <option value="asc">Ordenar A-Z</option>
            <option value="desc">Ordenar Z-A</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="pc-error-container">
          <div className="pc-error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      )}

      <ProductGrid
        products={sortedProducts}
        onAddProduct={handleAddToOrder}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        searchTerm={debouncedSearchTerm}
        generateProductKey={generateProductKey}
        loading={loading}
      />
      
      {!loading && products.length === 0 && (
        <div className="pc-empty-state">
          <FaBoxOpen className="pc-empty-icon" />
          <h3>No se encontraron productos</h3>
          <p>{debouncedSearchTerm 
            ? `No hay productos que coincidan con "${debouncedSearchTerm}"`
            : 'No hay productos disponibles en este momento'
          }</p>
        </div>
      )}
    </div>
  );
};

// Hook para debounce
function useDebounce(value, delay) {
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
}

export default ProductCatalog;