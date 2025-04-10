import React, { useEffect } from 'react';
import { useStore } from '../context';
import OrderItem from '../components/OrderItem';
import { useNavigate } from 'react-router-dom';
import '../styles/orders.css';

const Orders = () => {
  const { user, orders, isLoading, error, loadOrders } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.CodigoCliente) {
      loadOrders(user.CodigoCliente);
    }
  }, [user, loadOrders]);

  const handleViewDetails = (order) => {
    navigate(`/order-details/${order.NumeroPedido}`, { state: { order } });
  };

  if (isLoading) return <div className="loading">Cargando pedidos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="orders-container">
      <h2>Historial de Pedidos</h2>
      
      {orders.length === 0 ? (
        <div className="no-orders">
          <p>Aún no has realizado ningún pedido</p>
          <button onClick={() => navigate('/products')}>Ver Productos</button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={`${order.NumeroPedido}-${order.FechaPedido}`} className="order-card">
              <div className="order-header">
                <span className="order-number">Pedido #{order.NumeroPedido}</span>
                <span className="order-date">
                  {new Date(order.FechaPedido).toLocaleDateString()}
                </span>
              </div>
              
              <div className="order-details">
                <span>Estado: {order.Estado}</span>
                <span>Total: ${order.Total?.toFixed(2) || '--'}</span>
              </div>
              
              <button 
                onClick={() => handleViewDetails(order)}
                className="view-details"
              >
                Ver Detalles
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;