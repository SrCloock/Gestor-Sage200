// components/Catalog.js - VERSIÓN CON PAGINACIÓN Y ESTÉTICA ORIGINAL
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductCard from './ProductCard';
import CatalogFilters from './CatalogFilters';
import { FaSearch, FaSync, FaBox } from 'react-icons/fa';
import '../styles/Catalog.css';

const Catalog = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    proveedor: '',
    precioMin: '',
    precioMax: ''
  });
  const [sortBy, setSortBy] = useState('nombre');
  
  // Estados de paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Función para buscar productos con todos los parámetros
  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page,
        limit: pagination.limit,
        sortBy,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.proveedor && { proveedor: filters.proveedor }),
        ...(filters.precioMin && { precioMin: filters.precioMin }),
        ...(filters.precioMax && { precioMax: filters.precioMax })
      };

      const response = await api.get('/catalog/products', { params });
      
      if (response.data.success) {
        setProducts(response.data.products);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        });
      } else {
        setError('Error al cargar los productos');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Cargar productos cuando cambien los filtros, búsqueda u ordenamiento
  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm, filters, sortBy]);

  // Cambiar de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProducts(newPage);
    }
  };

  const handleAddToOrder = (product) => {
    console.log('Añadir al pedido:', product);
  };

  const handleRefresh = () => {
    fetchProducts(pagination.page);
  };

  // Generar botones de paginación
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Botón anterior
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(pagination.page - 1)}
        disabled={pagination.page === 1}
        className="pagination-btn"
      >
        ‹
      </button>
    );

    // Botones de páginas
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-btn ${pagination.page === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    // Botón siguiente
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(pagination.page + 1)}
        disabled={pagination.page === pagination.totalPages}
        className="pagination-btn"
      >
        ›
      </button>
    );

    return buttons;
  };

  if (loading && products.length === 0) {
    return (
      <div className="catalog-loading">
        <div className="loading-spinner"></div>
        <p>Cargando catálogo de productos...</p>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="catalog-error">
        <div className="error-icon">⚠️</div>
        <h3>Error al cargar el catálogo</h3>
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-button">
          <FaSync /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="catalog-container">
      <div className="catalog-header">
        <div className="catalog-title">
          <FaBox className="title-icon" />
          <h1>Catálogo de Productos</h1>
        </div>
        <p className="catalog-subtitle">
          Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
        </p>
      </div>

      <div className="catalog-controls">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar productos por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="clear-search"
            >
              ×
            </button>
          )}
        </div>

        <div className="sort-container">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="nombre">Ordenar por nombre</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="proveedor">Ordenar por proveedor</option>
          </select>
        </div>
      </div>

      <div className="catalog-content">
        <CatalogFilters 
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        <div className="products-grid">
          {products.length === 0 ? (
            <div className="no-products">
              <div className="no-products-icon">🔍</div>
              <h3>No se encontraron productos</h3>
              <p>Intenta ajustar los filtros o términos de búsqueda</p>
            </div>
          ) : (
            products.map(product => (
              <ProductCard
                key={`${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}`}
                product={product}
                onAddToOrder={handleAddToOrder}
              />
            ))
          )}
        </div>
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Página {pagination.page} de {pagination.totalPages}
          </div>
          <div className="pagination-controls">
            {renderPaginationButtons()}
          </div>
          <div className="pagination-size">
            <label>Mostrar:</label>
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }));
                setTimeout(() => fetchProducts(1), 0);
              }}
            >
              <option value="12">12</option>
              <option value="20">20</option>
              <option value="40">40</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;