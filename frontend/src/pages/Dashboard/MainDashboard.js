import React, { useEffect, useState } from 'react';
import { fetchProducts, fetchOrders } from '../../services/productService';
import { BarChart, PieChart } from '../../components/UI/Charts';

const MainDashboard = () => {
  const [stats, setStats] = useState({
    productCount: 0,
    orderCount: 0,
    topProducts: [],
    salesData: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [products, orders] = await Promise.all([
          fetchProducts(),
          fetchOrders()
        ]);

        // Simular datos para el dashboard
        const topProducts = products
          .slice(0, 5)
          .map(p => ({ name: p.NombreArticulo, value: Math.floor(Math.random() * 100) }));

        const salesData = [
          { name: 'Ene', value: Math.floor(Math.random() * 5000) },
          { name: 'Feb', value: Math.floor(Math.random() * 5000) },
          { name: 'Mar', value: Math.floor(Math.random() * 5000) },
          { name: 'Abr', value: Math.floor(Math.random() * 5000) },
        ];

        setStats({
          productCount: products.length,
          orderCount: orders.length,
          topProducts,
          salesData
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();
  }, []);

  return (
    <div className="dashboard">
      <h2>Panel de Control</h2>
      
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

      <div className="charts-container">
        <div className="chart">
          <h3>Ventas Mensuales</h3>
          <BarChart data={stats.salesData} />
        </div>
        
        <div className="chart">
          <h3>Productos Más Vendidos</h3>
          <PieChart data={stats.topProducts} />
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;