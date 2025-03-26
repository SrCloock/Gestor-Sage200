import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/Products/ProductCard';
import ProductSearch from '../../components/Products/ProductSearch';
import ProductFilter from '../../components/Products/ProductFilter';
import { fetchProducts } from '../../services/productService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
        setFilteredProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="product-list-page">
      <h1>Catálogo de Productos</h1>
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
      <div className="product-grid">
        {filteredProducts.map(product => (
          <ProductCard
            key={product.CodigoArticulo}
            product={product}
            onAddToCart={addToCart}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductList;