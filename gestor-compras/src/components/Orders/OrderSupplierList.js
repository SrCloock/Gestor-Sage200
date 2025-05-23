import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { FaTruck, FaPlusCircle, FaCheckCircle, FaClock, FaEye } from 'react-icons/fa';
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
            codigoProveedor: user?.codigoProveedor,
            seriePedido: 'Web'
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
    <div className="order-supplier-list-container">
      <h2><FaTruck /> Pedidos a Proveedores</h2>
      
      {orders.length === 0 ? (
        <div className="order-supplier-no-orders">
          <p>No hay pedidos registrados con proveedores</p>
          <button 
            onClick={() => navigate('/crear-pedido-proveedor')}
            className="order-supplier-create-button"
          >
            <FaPlusCircle /> Nuevo Pedido
          </button>
        </div>
      ) : (
        <div className="order-supplier-table-container">
          <table className="order-supplier-table">
            <thead>
              <tr>
                <th>N° Pedido</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Suministros</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.NumeroPedido}>
                  <td>#{order.NumeroPedido}</td>
                  <td>{new Date(order.FechaPedido).toLocaleDateString()}</td>
                  <td>
                    <span className={`order-supplier-status-badge ${order.StatusAprobado ? 'approved' : 'pending'}`}>
                      {order.StatusAprobado ? <FaCheckCircle /> : <FaClock />}
                      {order.StatusAprobado ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </td>
                  <td>{order.NumeroLineas} artículos</td>
                  <td>
                    <button 
                      onClick={() => handleViewDetails(order.NumeroPedido)}
                      className="order-supplier-view-button"
                    >
                      <FaEye /> Detalles
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