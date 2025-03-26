import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/Products/ProductCard';
import ProductSearch from '../../components/Products/ProductSearch';
import ProductFilter from '../../components/Products/ProductFilter';
import { fetchProducts, testConnection } from '../../services/productService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Notification from '../../components/UI/Notification';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const initialize = async () => {
      try {
        const isBackendAlive = await testConnection();
        if (!isBackendAlive) {
          throw new Error('No se puede conectar con el servidor');
        }

        const data = await fetchProducts();
        setProducts(data);
        setFilteredProducts(data);
      } catch (err) {
        console.error('Error inicializando:', err);
        setError(err.message || 'Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  if (error) {
    return (
      <div className="container mt-5">
        <Notification type="error" message={error} />
        <button 
          className="btn btn-retry"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <h1 className="page-title">Catálogo de Productos</h1>
      
      <div className="product-controls">
        <ProductSearch 
          products={products} 
          onSearch={setFilteredProducts} 
        />
        <ProductFilter 
          products={products} 
          onFilter={setFilteredProducts} 
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="no-results">
          No se encontraron productos con los filtros aplicados
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                image: product.imagenUrl || '/placeholder-product.jpg'
              }}
              onAddToCart={() => addToCart(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;