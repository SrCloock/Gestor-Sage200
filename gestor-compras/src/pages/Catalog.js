import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import OrderSummary from '../components/OrderSummary';
import Pagination from '../components/Pagination';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [orderItems, setOrderItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`/api/products?page=${currentPage}`);
        setProducts(response.data.products);
        setTotalPages(Math.ceil(response.data.total / response.data.limit));
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    fetchProducts();
  }, [currentPage]);

  const handleAddToOrder = (product, quantity) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { ...product, quantity }];
    });
  };

  const handleConfirmOrder = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    navigate('/confirm', { state: { items: orderItems, user } });
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Catálogo de Productos</h2>
      
      {orderItems.length > 0 && (
        <OrderSummary 
          items={orderItems} 
          onEdit={() => setOrderItems([])}
          onConfirm={handleConfirmOrder}
        />
      )}
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {products.map(product => (
          <ProductCard 
            key={product.id}
            product={product}
            onAdd={handleAddToOrder}
          />
        ))}
      </div>
      
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default Catalog;