import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './OrderSupplierList.css';

const OrderSupplierList = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/supplier-orders', {
          params: {
            codigoProveedor: user?.codigoProveedor
          }
        });
        setOrders(response.data.orders);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar los pedidos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.codigoProveedor) {
      fetchOrders();
    }
  }, [user]);

  const handleViewDetails = (orderId) => {
    navigate(`/mis-pedidos-proveedor/${orderId}`);
  };

  if (loading) return <div className="loading">Cargando pedidos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="order-list-container">
      <h2>Mis Pedidos a Proveedores</h2>
      
      {orders.length === 0 ? (
        <div className="no-orders">
          <p>No tienes pedidos registrados</p>
          <button 
            onClick={() => navigate('/crear-pedido-proveedor')}
            className="create-order-button"
          >
            Crear nuevo pedido
          </button>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Artículos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.NumeroPedido}>
                  <td>{order.NumeroPedido}</td>
                  <td>{new Date(order.FechaPedido).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${order.StatusAprobado ? 'approved' : 'pending'}`}>
                      {order.StatusAprobado ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </td>
                  <td>{order.NumeroLineas}</td>
                  <td>
                    <button 
                      onClick={() => handleViewDetails(order.NumeroPedido)}
                      className="view-details-button"
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderSupplierList;