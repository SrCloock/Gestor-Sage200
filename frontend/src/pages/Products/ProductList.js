import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/Products/ProductCard';
import ProductSearch from '../../components/Products/ProductSearch';
import ProductFilter from '../../components/Products/ProductFilter';
import { fetchProducts, testConnection } from '../../services/productService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Notification from '../../components/UI/Notification';
import './ProductList.css';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const isConnected = await testConnection();
        if (!isConnected) {
          throw new Error('No se pudo conectar al servidor');
        }

        const productsData = await fetchProducts();
        if (!productsData || productsData.length === 0) {
          throw new Error('No se encontraron productos');
        }

        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        setError(err.message || 'Error al cargar los productos');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    let results = [...products];
    
    // Aplicar búsqueda
    if (searchTerm) {
      results = results.filter(product =>
        product.NombreArticulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.CodigoArticulo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Aplicar filtros
    if (filter === 'price_asc') {
      results.sort((a, b) => a.Precio - b.Precio);
    } else if (filter === 'price_desc') {
      results.sort((a, b) => b.Precio - a.Precio);
    } else if (filter === 'available') {
      results = results.filter(p => p.Stock > 0);
    }

    setFilteredProducts(results);
  }, [searchTerm, filter, products]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleFilter = (filterType) => {
    setFilter(filterType);
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error) {
    return (
      <div className="error-container">
        <Notification type="error" message={error} />
        <button
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <div className="product-list-header">
        <h1>Catálogo de Productos</h1>
        <div className="product-controls">
          <ProductSearch onSearch={handleSearch} />
          <ProductFilter 
            onFilter={handleFilter} 
            filters={[
              { value: 'all', label: 'Todos' },
              { value: 'price_asc', label: 'Precio: Menor a Mayor' },
              { value: 'price_desc', label: 'Precio: Mayor a Menor' },
              { value: 'available', label: 'Disponibles' }
            ]}
          />
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <ProductCard
              key={product.CodigoArticulo}
              product={product}
              onAddToCart={() => addToCart(product)}
            />
          ))
        ) : (
          <div className="no-products">
            No se encontraron productos con los filtros aplicados
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;