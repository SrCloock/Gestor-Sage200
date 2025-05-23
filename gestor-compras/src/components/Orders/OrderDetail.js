import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { FaArrowLeft, FaCheckCircle, FaClock } from 'react-icons/fa';
import './OrderDetail.css';

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

  if (loading) return <div className="loading">Cargando detalles del pedido...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!order) return <div>No se encontró el pedido</div>;

  return (
    <div className="order-detail-container">
      <button onClick={() => navigate(-1)} className="back-button">
        <FaArrowLeft /> Volver al Historial
      </button>
      
      <div className="order-header">
        <h2>Pedido Dental #{order.NumeroPedido}</h2>
        <span className={`status-badge ${order.Estado === 'Aprobado' ? 'approved' : 'pending'}`}>
          {order.Estado === 'Aprobado' ? <FaCheckCircle /> : <FaClock />}
          {order.Estado || 'Pendiente'}
        </span>
      </div>
      
      <div className="order-info-grid">
        <div className="info-card">
          <h3>Detalles del Pedido</h3>
          <div className="info-row">
            <span className="info-label">Fecha de creación:</span>
            <span>{new Date(order.FechaPedido).toLocaleDateString()}</span>
          </div>
          {order.FechaNecesaria && (
            <div className="info-row">
              <span className="info-label">Fecha requerida:</span>
              <span>{new Date(order.FechaNecesaria).toLocaleDateString()}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Total artículos:</span>
            <span>{order.Productos.length}</span>
          </div>
        </div>
        
        <div className="info-card">
          <h3>Información de la Clínica</h3>
          <div className="info-row">
            <span className="info-label">Clínica:</span>
            <span>{order.RazonSocial}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Identificador:</span>
            <span>{order.CifDni}</span>
          </div>
        </div>
      </div>
      
      <h3 className="products-title">Instrumental y Suministros</h3>
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {order.Productos.map((product, index) => (
              <tr key={index}>
                <td>{product.CodigoArticulo}</td>
                <td>{product.DescripcionArticulo}</td>
                <td>{product.UnidadesPedidas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderDetail;