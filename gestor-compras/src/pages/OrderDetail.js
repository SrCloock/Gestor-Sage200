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

  const getStatusText = (status) => {
    return Number(status) === 0 ? 'Pendiente' : 'Servido';
  };

  if (loading) return <div className="loading">Cargando detalles del pedido...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!order) return <div>No se encontró el pedido</div>;

  return (
    <div className="order-detail-container">
      <button onClick={() => navigate(-1)} className="back-button">
        &larr; Volver al Historial
      </button>
      
      <div className="order-header">
        <h2>Pedido #{order.NumeroPedido}</h2>
        <span className={`status-badge ${Number(order.Estado) === 0 ? 'pending' : 'served'}`}>
          {getStatusText(order.Estado)}
        </span>
      </div>
      
      <div className="order-info-grid">
        <div className="info-card">
          <h3>Información General</h3>
          <div className="info-row">
            <span className="info-label">Fecha de Pedido:</span>
            <span>{new Date(order.FechaPedido).toLocaleDateString()}</span>
          </div>
          {order.FechaNecesaria && (
            <div className="info-row">
              <span className="info-label">Fecha Necesaria:</span>
              <span>{new Date(order.FechaNecesaria).toLocaleDateString()}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Total Artículos:</span>
            <span>{order.Productos.length}</span>
          </div>
        </div>
        
        <div className="info-card">
          <h3>Información del Cliente</h3>
          <div className="info-row">
            <span className="info-label">Razón Social:</span>
            <span>{order.RazonSocial}</span>
          </div>
          <div className="info-row">
            <span className="info-label">CIF/DNI:</span>
            <span>{order.CifDni || 'No disponible'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Dirección:</span>
            <span>
              {order.Domicilio}, {order.CodigoPostal} {order.Municipio}, {order.Provincia}
            </span>
          </div>
        </div>
      </div>
      
      <div className="order-actions">
        {Number(order.Estado) === 0 && (
          <button 
            onClick={() => navigate(`/mis-pedidos/${orderId}/recepcion`)}
            className="reception-button"
          >
            Confirmar Recepción
          </button>
        )}
      </div>

      <h3 className="products-title">Artículos del Pedido</h3>
      <div className="products-table-container">
        <table className="products-table">
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
              <tr key={index}>
                <td>{product.CodigoArticulo}</td>
                <td>{product.DescripcionArticulo}</td>
                <td>{product.UnidadesPedidas}</td>
                <td>{product.Precio ? product.Precio.toFixed(2) + ' €' : '-'}</td>
                <td>{product.ImporteLiquido ? product.ImporteLiquido.toFixed(2) + ' €' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderDetail;