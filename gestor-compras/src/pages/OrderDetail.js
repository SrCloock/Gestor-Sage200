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
        console.log('Obteniendo detalles del pedido:', orderId, 'para cliente:', user?.codigoCliente);
        
        const response = await api.get(`/api/orders/${orderId}`, {
          params: {
            codigoCliente: user?.codigoCliente,
            seriePedido: 'WebCD'
          }
        });
        
        console.log('Respuesta del API:', response.data);
        
        if (response.data && response.data.order) {
          setOrder(response.data.order);
        } else {
          setError('No se encontraron datos del pedido');
        }
      } catch (err) {
        console.error('Error detallado:', err);
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else if (err.response?.status === 404) {
          setError('El pedido solicitado no existe.');
        } else {
          setError(err.response?.data?.message || 'Error al cargar los detalles del pedido');
        }
      } finally {
        setLoading(false);
      }
    };
  
    if (user?.codigoCliente) {
      fetchOrderDetails();
    } else {
      setError('No se pudo identificar el cliente');
      setLoading(false);
    }
  }, [orderId, user]);

  // Función para determinar si se puede confirmar recepción
  const canConfirmReception = () => {
    if (!order) return false;
    return order.StatusAprobado === -1 && order.Estado !== 2;
  };

  // Función para obtener el texto del estado
  const getStatusText = () => {
    if (!order) return 'Desconocido';
    
    if (order.StatusAprobado === 0) return 'Revisando';
    if (order.StatusAprobado === -1) {
      switch (order.Estado) {
        case 0: return 'Preparando';
        case 1: return 'Parcial';
        case 2: return 'Servido';
        default: return 'Preparando';
      }
    }
    return 'Desconocido';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

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
      <div className="od-error-actions">
        <button onClick={handleRefresh} className="od-retry-button">
          Reintentar
        </button>
        <button onClick={() => navigate('/mis-pedidos')} className="od-back-button">
          Volver al Historial
        </button>
      </div>
    </div>
  );

  if (!order) return (
    <div className="od-not-found">
      <div className="od-not-found-icon">❌</div>
      <h3>No se encontró el pedido</h3>
      <p>El pedido solicitado no existe o no tienes permisos para verlo</p>
      <button onClick={() => navigate('/mis-pedidos')} className="od-back-button">
        Volver al Historial
      </button>
    </div>
  );

  // Asegurarse de que productos existe y es un array
  const productos = order.productos || order.Productos || [];
  const numeroLineas = productos.length;

  return (
    <div className="od-container">
      <button onClick={() => navigate('/mis-pedidos')} className="od-back-button">
        ← Volver al Historial
      </button>
      
      <div className="od-header">
        <div className="od-title-section">
          <h2>Pedido #{order.NumeroPedido}</h2>
          <span className={`od-status-badge od-status-${getStatusText().toLowerCase()}`}>
            {getStatusText()}
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
            <span className="od-info-value">{numeroLineas}</span>
          </div>
          <div className="od-info-row">
            <span className="od-info-label">Total del Pedido:</span>
            <span className="od-info-value">
              {order.ImporteLiquido ? `${order.ImporteLiquido.toFixed(2)} €` : '0.00 €'}
            </span>
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
        {canConfirmReception() && (
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
          <span className="od-items-count">{numeroLineas} productos</span>
        </div>
        
        {numeroLineas === 0 ? (
          <div className="od-empty-products">
            <div className="od-empty-icon">📦</div>
            <p>No hay productos en este pedido</p>
          </div>
        ) : (
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
                {productos.map((product, index) => {
                  const cantidad = product.UnidadesPedidas || product.Cantidad || 0;
                  const precio = product.Precio || 0;
                  const total = product.ImporteLiquido || (precio * cantidad);
                  
                  return (
                    <tr key={index} className="od-product-row">
                      <td className="od-product-code">{product.CodigoArticulo}</td>
                      <td className="od-product-description">{product.DescripcionArticulo}</td>
                      <td className="od-product-quantity">{cantidad}</td>
                      <td className="od-product-price">
                        {precio ? `${precio.toFixed(2)} €` : '0.00 €'}
                      </td>
                      <td className="od-product-total">
                        {total ? `${total.toFixed(2)} €` : '0.00 €'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;