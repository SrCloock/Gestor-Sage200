import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './OrderSupplierDetail.css';

const OrderSupplierDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/api/supplier-orders/${orderId}`, {
          params: {
            codigoProveedor: user?.codigoProveedor,
            seriePedido: 'Web' 
          }
        });
        setOrder(response.data.order);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar los detalles del pedido');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
  
    if (user?.codigoProveedor) {
      fetchOrderDetails();
    }
  }, [orderId, user]);

  if (loading) return <div className="loading">Cargando detalles del pedido...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!order) return <div>No se encontró el pedido</div>;

  return (
    <div className="order-detail-container">
      <button onClick={() => navigate(-1)} className="back-button">
        &larr; Volver al Historial
      </button>
      
      <div className="order-header">
        <h2>Pedido a Proveedor #{order.NumeroPedido}</h2>
        <span className={`status-badge ${order.StatusAprobado ? 'approved' : 'pending'}`}>
          {order.StatusAprobado ? 'Aprobado' : 'Pendiente'}
        </span>
      </div>
      
      <div className="order-info-grid">
        <div className="info-card">
          <h3>Información General</h3>
          <div className="info-row">
            <span className="info-label">Fecha de Pedido:</span>
            <span>{new Date(order.FechaPedido).toLocaleDateString()}</span>
          </div>
          {order.FechaEntrega && (
            <div className="info-row">
              <span className="info-label">Fecha de Entrega:</span>
              <span>{new Date(order.FechaEntrega).toLocaleDateString()}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Total Artículos:</span>
            <span>{order.lineas.length}</span>
          </div>
        </div>
        
        <div className="info-card">
          <h3>Información del Proveedor</h3>
          <div className="info-row">
            <span className="info-label">Razón Social:</span>
            <span>{order.RazonSocial}</span>
          </div>
          <div className="info-row">
            <span className="info-label">CIF/DNI:</span>
            <span>{order.CifDni}</span>
          </div>
        </div>
      </div>
      
      <h3 className="products-title">Artículos del Pedido</h3>
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lineas.map((product, index) => (
              <tr key={index}>
                <td>{product.CodigoArticulo}</td>
                <td>{product.DescripcionArticulo}</td>
                <td>{product.UnidadesPedidas}</td>
                <td>{product.Precio.toFixed(2)} €</td>
                <td>{product.ImporteTotal.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderSupplierDetail;