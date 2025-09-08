import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import '../styles/OrderDetail.css';

const OrderDetail = () => {
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
        const response = await api.get(`/api/orders/${orderId}`, {
          params: {
            codigoCliente: user?.codigoCliente,
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
  
    if (user?.codigoCliente) {
      fetchOrderDetails();
    }
  }, [orderId, user]);

  if (loading) return (
    <div className="od-loading-container">
      <div className="od-spinner"></div>
      <p>Cargando detalles del pedido...</p>
    </div>
  );

  if (error) return (
    <div className="od-error-container">
      <div className="od-error-icon">⚠️</div>
      <p>{error}</p>
    </div>
  );

  if (!order) return (
    <div className="od-not-found">
      <div className="od-not-found-icon">❌</div>
      <h3>No se encontró el pedido</h3>
      <p>El pedido solicitado no existe o no tienes permisos para verlo</p>
    </div>
  );

  return (
    <div className="od-container">
      <button onClick={() => navigate(-1)} className="od-back-button">
        ← Volver al Historial
      </button>
      
      <div className="od-header">
        <div className="od-title-section">
          <h2>Pedido #{order.NumeroPedido}</h2>
          <span className={`od-status-badge ${order.Estado === 'Preparando' ? 'od-status-preparing' : 'od-status-served'}`}>
            {order.Estado}
          </span>
        </div>
        <p className="od-order-date">
          Realizado el {new Date(order.FechaPedido).toLocaleDateString()}
        </p>
      </div>
      
      <div className="od-info-grid">
        <div className="od-info-card">
          <div className="od-card-header">
            <h3>Información General</h3>
            <div className="od-card-icon">📦</div>
          </div>
          <div className="od-info-row">
            <span className="od-info-label">Fecha de Pedido:</span>
            <span className="od-info-value">{new Date(order.FechaPedido).toLocaleDateString()}</span>
          </div>
          {order.FechaNecesaria && (
            <div className="od-info-row">
              <span className="od-info-label">Fecha Necesaria:</span>
              <span className="od-info-value">{new Date(order.FechaNecesaria).toLocaleDateString()}</span>
            </div>
          )}
          <div className="od-info-row">
            <span className="od-info-label">Total Artículos:</span>
            <span className="od-info-value">{order.Productos.length}</span>
          </div>
        </div>
        
        <div className="od-info-card">
          <div className="od-card-header">
            <h3>Información del Cliente</h3>
            <div className="od-card-icon">👤</div>
          </div>
          <div className="od-info-row">
            <span className="od-info-label">Razón Social:</span>
            <span className="od-info-value">{order.RazonSocial}</span>
          </div>
          <div className="od-info-row">
            <span className="od-info-label">CIF/DNI:</span>
            <span className="od-info-value">{order.CifDni || 'No disponible'}</span>
          </div>
          <div className="od-info-row">
            <span className="od-info-label">Dirección:</span>
            <span className="od-info-value">
              {order.Domicilio}, {order.CodigoPostal} {order.Municipio}, {order.Provincia}
            </span>
          </div>
        </div>
      </div>
      
      <div className="od-actions">
        {order.Estado === 'Preparando' && (
          <button 
            onClick={() => navigate(`/mis-pedidos/${orderId}/recepcion`)}
            className="od-action-button od-primary-button"
          >
            Confirmar Recepción
          </button>
        )}
      </div>

      <div className="od-products-section">
        <div className="od-section-header">
          <h3>Artículos del Pedido</h3>
          <span className="od-items-count">{order.Productos.length} productos</span>
        </div>
        <div className="od-table-container">
          <table className="od-products-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.Productos.map((product, index) => (
                <tr key={index} className="od-product-row">
                  <td className="od-product-code">{product.CodigoArticulo}</td>
                  <td className="od-product-description">{product.DescripcionArticulo}</td>
                  <td className="od-product-quantity">{product.UnidadesPedidas}</td>
                  <td className="od-product-price">
                    {product.Precio ? `${product.Precio.toFixed(2)} €` : '-'}
                  </td>
                  <td className="od-product-total">
                    {product.ImporteLiquido ? `${product.ImporteLiquido.toFixed(2)} €` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;