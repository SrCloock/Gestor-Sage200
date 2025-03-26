// Archivo: ProductsPage.js
import React, { useState, useEffect, useContext } from 'react';
import { CartContext } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    fetch('http://localhost:3000/api/products')
      .then(res => res.json())
      .then(setProducts);
  }, []);

  return (
    <div className="products-page">
      <SearchBar 
        onSearch={(term) => {
          fetch(`http://localhost:3000/api/products/search?term=${term}`)
            .then(res => res.json())
            .then(setProducts);
        }}
      />
      
      <div className="product-grid">
        {products.map(product => (
          <ProductCard 
            key={product.Codigo} 
            product={product} 
            onAddToCart={addToCart}
          />
        ))}
      </div>
    </div>
  );
};