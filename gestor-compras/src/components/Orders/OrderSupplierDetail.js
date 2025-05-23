import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { FaArrowLeft, FaCheckCircle, FaClock, FaTruck } from 'react-icons/fa';
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
    <div className="order-supplier-detail-container">
      <button onClick={() => navigate(-1)} className="order-supplier-back-button">
        <FaArrowLeft /> Volver a Pedidos
      </button>
      
      <div className="order-supplier-header">
        <h2><FaTruck /> Pedido Proveedor #{order.NumeroPedido}</h2>
        <span className={`order-supplier-status-badge ${order.StatusAprobado ? 'approved' : 'pending'}`}>
          {order.StatusAprobado ? <FaCheckCircle /> : <FaClock />}
          {order.StatusAprobado ? 'Aprobado' : 'Pendiente'}
        </span>
      </div>
      
      <div className="order-supplier-info-grid">
        <div className="order-supplier-info-card">
          <h3>Información del Pedido</h3>
          <div className="order-supplier-info-row">
            <span className="order-supplier-info-label">Fecha creación:</span>
            <span>{new Date(order.FechaPedido).toLocaleDateString()}</span>
          </div>
          {order.FechaEntrega && (
            <div className="order-supplier-info-row">
              <span className="order-supplier-info-label">Fecha entrega:</span>
              <span>{new Date(order.FechaEntrega).toLocaleDateString()}</span>
            </div>
          )}
          <div className="order-supplier-info-row">
            <span className="order-supplier-info-label">Total artículos:</span>
            <span>{order.lineas.length}</span>
          </div>
        </div>
        
        <div className="order-supplier-info-card">
          <h3>Datos del Proveedor</h3>
          <div className="order-supplier-info-row">
            <span className="order-supplier-info-label">Proveedor:</span>
            <span>{order.RazonSocial}</span>
          </div>
          <div className="order-supplier-info-row">
            <span className="order-supplier-info-label">Identificador:</span>
            <span>{order.CifDni}</span>
          </div>
        </div>
      </div>
      
      <h3 className="order-supplier-products-title">Suministros Dentales Solicitados</h3>
      <div className="order-supplier-products-container">
        <table className="order-supplier-products-table">
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
            {order.lineas.map((product, index) => (
              <tr key={index}>
                <td>{product.CodigoArticulo}</td>
                <td>{product.DescripcionArticulo}</td>
                <td>{product.UnidadesPedidas}</td>
                <td className="currency">{product.Precio.toFixed(2)} €</td>
                <td className="currency">{product.ImporteTotal.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderSupplierDetail;