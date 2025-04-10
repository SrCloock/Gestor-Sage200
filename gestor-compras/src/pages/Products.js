import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { CartContext } from '../context/CartContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    axios.get('/api/products').then((res) => setProducts(res.data.data));
  }, []);

  return (
    <div>
      <h2>Productos</h2>
      <div>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </div>
    </div>
  );
};

export default Products;