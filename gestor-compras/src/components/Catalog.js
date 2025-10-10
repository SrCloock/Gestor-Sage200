// components/Catalog.js
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
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    proveedor: '',
    precioMin: '',
    precioMax: ''
  });
  const [sortBy, setSortBy] = useState('nombre');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await api.get('/api/catalog/products');
        
        if (response.data.success) {
          setProducts(response.data.products);
          setFilteredProducts(response.data.products);
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

    fetchProducts();
  }, []);

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let result = [...products];

    // Filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product => 
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term)
      );
    }

    // Filtro por proveedor
    if (filters.proveedor) {
      result = result.filter(product => 
        product.CodigoProveedor === filters.proveedor
      );
    }

    // Filtro por precio mínimo
    if (filters.precioMin) {
      result = result.filter(product => 
        product.PrecioVenta >= parseFloat(filters.precioMin)
      );
    }

    // Filtro por precio máximo
    if (filters.precioMax) {
      result = result.filter(product => 
        product.PrecioVenta <= parseFloat(filters.precioMax)
      );
    }

    // Ordenar
    result.sort((a, b) => {
      switch (sortBy) {
        case 'nombre':
          return a.DescripcionArticulo.localeCompare(b.DescripcionArticulo);
        case 'precio-asc':
          return a.PrecioVenta - b.PrecioVenta;
        case 'precio-desc':
          return b.PrecioVenta - a.PrecioVenta;
        case 'proveedor':
          return a.NombreProveedor.localeCompare(b.NombreProveedor);
        default:
          return 0;
      }
    });

    setFilteredProducts(result);
  }, [products, searchTerm, filters, sortBy]);

  const handleAddToOrder = (product) => {
    // Esta función se conectará con el sistema de pedidos
    console.log('Añadir al pedido:', product);
    // Aquí implementarás la lógica para añadir al carrito/pedido
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="catalog-loading">
        <div className="loading-spinner"></div>
        <p>Cargando catálogo de productos...</p>
      </div>
    );
  }

  if (error) {
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
          {filteredProducts.length} productos disponibles
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
          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <div className="no-products-icon">🔍</div>
              <h3>No se encontraron productos</h3>
              <p>Intenta ajustar los filtros o términos de búsqueda</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <ProductCard
                key={product.CodigoArticulo}
                product={product}
                onAddToOrder={handleAddToOrder}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Catalog;