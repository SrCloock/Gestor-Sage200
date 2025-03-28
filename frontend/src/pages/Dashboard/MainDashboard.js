import React, { useEffect, useState } from 'react';
import { fetchProducts, fetchOrders } from '../../services/productService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './MainDashboard.css';

const MainDashboard = () => {
  const [stats, setStats] = useState({
    productCount: 0,
    orderCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [products, orders] = await Promise.all([
          fetchProducts(),
          fetchOrders()
        ]);
        
        setStats({
          productCount: products.length,
          orderCount: orders.length
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="dashboard-container">
      <h1>Panel de Control</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Productos</h3>
          <p>{stats.productCount}</p>
        </div>
        
        <div className="stat-card">
          <h3>Pedidos Totales</h3>
          <p>{stats.orderCount}</p>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;